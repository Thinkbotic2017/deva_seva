import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { SevaType } from '../../database/entities/seva-type.entity';
import { Temple } from '../../database/entities/temple.entity';
import { FinanceService } from '../finance/finance.service';
import { FiscalYearUtil } from '../../common/utils/fiscal-year.util';
import { ReceiptNumberUtil } from '../../common/utils/receipt-number.util';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { CreateSevaBookingDto } from './dto/create-seva-booking.dto';
import { ListSevaBookingsQueryDto } from './dto/list-seva-bookings-query.dto';
import { CancelSevaBookingDto } from './dto/cancel-seva-booking.dto';
import {
  SevaBookingPaymentMode,
  SevaBookingStatus,
  PaginatedResult,
} from '@devaseva/types';

/**
 * SevaBookingService manages the full lifecycle of seva reservations.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
 * - All availability checks run inside a DB transaction with a FOR UPDATE lock on SevaType.
 *
 * Financial invariants:
 * - Offline bookings (CASH/UPI/CARD) are CONFIRMED immediately; income is posted atomically.
 * - Online bookings start as PENDING_PAYMENT; income is posted after payment confirmation.
 * - Cancellation of a CONFIRMED booking posts a REVERSAL entry (EXPENSE) — ledger is append-only.
 * - Booking numbers are generated via Redis INCR after the transaction commits.
 */
@Injectable()
export class SevaBookingService {
  private readonly logger = new Logger(SevaBookingService.name);

  constructor(
    @InjectRepository(SevaBooking)
    private readonly bookingRepo: Repository<SevaBooking>,
    @InjectRepository(SevaType)
    private readonly sevaTypeRepo: Repository<SevaType>,
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    private readonly financeService: FinanceService,
    private readonly fiscalYearUtil: FiscalYearUtil,
    private readonly receiptNumberUtil: ReceiptNumberUtil,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a seva booking.
   *
   * Availability is validated inside a transaction with a SELECT FOR UPDATE lock on the
   * SevaType row. This serialises concurrent requests for the same slot, preventing
   * overbooking even under load.
   *
   * Booking flow:
   *   1. Transaction: lock SevaType → count existing bookings → insert SevaBooking.
   *   2. If offline payment (CASH/UPI/CARD): also post income to finance_ledger inside
   *      the same transaction → booking status = CONFIRMED.
   *   3. If online (ONLINE or no payment mode): status = PENDING_PAYMENT, no income yet.
   *   4. After transaction: generate booking number (Redis INCR).
   *
   * @param templeId   From req.user.templeId (JWT). NEVER from dto.
   * @param dto        Validated request body.
   * @param recordedBy userId of the staff member creating the booking.
   */
  async create(
    templeId: string,
    dto: CreateSevaBookingDto,
    recordedBy: string,
  ): Promise<SevaBooking> {
    const sevaDate = new Date(dto.sevaDate);
    const fiscalYear = this.fiscalYearUtil.fromDate(sevaDate);
    const amountStr = Number(dto.amount).toFixed(2);

    // Determine whether this is an offline (immediately confirmed) booking
    const isOfflinePayment =
      dto.paymentMode !== undefined &&
      dto.paymentMode !== SevaBookingPaymentMode.ONLINE;

    // ── Atomic transaction: availability check → insert → ledger ─────────────
    const savedBooking = await this.dataSource.transaction(async (manager) => {
      // Validate availability. Acquires a FOR UPDATE lock to prevent race conditions.
      await this.assertSlotAvailable(manager, templeId, dto.sevaTypeId, dto.sevaDate, dto.timeSlot);

      const booking = manager.create(SevaBooking, {
        templeId,
        sevaTypeId: dto.sevaTypeId,
        devoteeId: dto.devoteeId,
        devoteeName: dto.devoteeName,
        devoteePhone: dto.devoteePhone,
        sevaDate,
        timeSlot: dto.timeSlot,
        tierName: dto.tierName,
        amount: amountStr,
        paymentMode: dto.paymentMode,
        status: isOfflinePayment
          ? SevaBookingStatus.CONFIRMED
          : SevaBookingStatus.PENDING_PAYMENT,
        sankalphaName: dto.sankalpaName,
        gotra: dto.gotra,
        nakshatra: dto.nakshatra,
        sankalpaPurpose: dto.sankalpaPurpose,
        additionalNames: dto.additionalNames ?? [],
        priestId: dto.priestId,
        recordedBy,
        fiscalYear,
      });

      const inserted = await manager.save(booking);

      // Post income to finance ledger only for offline (immediately confirmed) bookings
      if (isOfflinePayment) {
        await this.financeService.autoPostIncome(manager, {
          templeId,
          amount: amountStr,
          entryDate: sevaDate,
          description: `Seva booking — ${dto.devoteeName}`,
          sevaBookingId: inserted.id,
          recordedBy,
          fiscalYear,
        });
      }

      return inserted;
    });
    // ── End transaction ───────────────────────────────────────────────────────

    // Generate booking number after the transaction (Redis INCR is atomic, no collision risk)
    if (isOfflinePayment) {
      const temple = await this.templeRepo.findOne({ where: { id: templeId } });
      const prefix = `${temple?.receiptPrefix ?? 'RCPT'}S`;
      const bookingNumber = await this.receiptNumberUtil.next(
        templeId,
        fiscalYear,
        prefix,
      );
      await this.bookingRepo.update(savedBooking.id, { bookingNumber });
      savedBooking.bookingNumber = bookingNumber;
    }

    this.logger.log(
      `Seva booking ${savedBooking.id} created for temple ${templeId} [status=${savedBooking.status}]`,
    );

    return savedBooking;
  }

  /**
   * Returns paginated seva bookings for a temple.
   * templeId guard is mandatory on every query — never query without it.
   */
  async findAll(
    templeId: string,
    query: ListSevaBookingsQueryDto,
  ): Promise<PaginatedResult<SevaBooking>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.bookingRepo
      .createQueryBuilder('sb')
      .where('sb.temple_id = :templeId', { templeId })
      .andWhere('sb.deleted_at IS NULL')
      .orderBy('sb.seva_date', 'ASC')
      .addOrderBy('sb.time_slot', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.date) {
      qb.andWhere('sb.seva_date = :date', { date: query.date });
    }
    if (query.status) {
      qb.andWhere('sb.status = :status', { status: query.status });
    }
    if (query.sevaTypeId) {
      qb.andWhere('sb.seva_type_id = :sevaTypeId', {
        sevaTypeId: query.sevaTypeId,
      });
    }
    if (query.priestId) {
      qb.andWhere('sb.priest_id = :priestId', { priestId: query.priestId });
    }

    const [data, total] = await qb.getManyAndCount();
    return toPaginatedResult(data, total, page, limit);
  }

  /**
   * Returns a single seva booking scoped to the temple.
   * Throws NotFoundException if not found or templeId mismatch.
   */
  async findById(templeId: string, bookingId: string): Promise<SevaBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, templeId },
    });

    if (!booking) {
      throw new NotFoundException(`Seva booking ${bookingId} not found`);
    }

    return booking;
  }

  /**
   * Cancels a seva booking.
   *
   * Cancellation rules:
   * - PENDING_PAYMENT → CANCELLED: no income was posted, no reversal needed.
   * - CONFIRMED → CANCELLED: income was posted; a REVERSAL (EXPENSE) entry is posted.
   * - COMPLETED, NO_SHOW → cannot be cancelled (throw 422).
   *
   * All DB writes (status update + optional reversal) are atomic in a single transaction.
   *
   * @param templeId   From req.user.templeId (JWT). Never from dto.
   * @param bookingId  Booking UUID.
   * @param dto        Contains the mandatory cancellation reason.
   * @param cancelledBy userId performing the cancellation (for audit).
   */
  async cancel(
    templeId: string,
    bookingId: string,
    dto: CancelSevaBookingDto,
    cancelledBy: string,
  ): Promise<SevaBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, templeId },
    });

    if (!booking) {
      throw new NotFoundException(`Seva booking ${bookingId} not found`);
    }

    if (booking.status === SevaBookingStatus.CANCELLED) {
      throw new UnprocessableEntityException('Booking is already cancelled');
    }

    if (
      booking.status === SevaBookingStatus.COMPLETED ||
      booking.status === SevaBookingStatus.NO_SHOW
    ) {
      throw new UnprocessableEntityException(
        `Cannot cancel a booking with status ${booking.status}`,
      );
    }

    const wasConfirmed = booking.status === SevaBookingStatus.CONFIRMED;
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.update(SevaBooking, bookingId, {
        status: SevaBookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: dto.reason,
      });

      // CONFIRMED bookings have an income entry that must be offset by a reversal.
      // The ledger is APPEND-ONLY — never delete or update the original entry.
      if (wasConfirmed) {
        await this.financeService.autoPostReversal(manager, {
          templeId,
          amount: booking.amount,
          entryDate: now,
          description: `Seva booking cancellation — ${booking.devoteeName} [${bookingId}]`,
          sevaBookingId: bookingId,
          recordedBy: cancelledBy,
          fiscalYear: booking.fiscalYear,
        });
      }
    });

    this.logger.log(
      `Seva booking ${bookingId} cancelled by ${cancelledBy} [wasConfirmed=${wasConfirmed}]`,
    );

    // Return the updated booking
    booking.status = SevaBookingStatus.CANCELLED;
    booking.cancelledAt = now;
    booking.cancellationReason = dto.reason;
    return booking;
  }

  /**
   * Links an existing devotee to a seva booking.
   * Safe to call multiple times (idempotent).
   *
   * @param templeId  From req.user.templeId (JWT). Never from dto.
   * @param bookingId UUID of the seva booking.
   * @param devoteeId UUID of the devotee to link.
   */
  async linkDevotee(
    templeId: string,
    bookingId: string,
    devoteeId: string,
  ): Promise<SevaBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, templeId },
    });

    if (!booking) {
      throw new NotFoundException(`Seva booking ${bookingId} not found`);
    }

    await this.bookingRepo.update(bookingId, { devoteeId });
    booking.devoteeId = devoteeId;
    return booking;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Checks whether a slot has capacity for one more booking.
   *
   * MUST be called inside a transaction. Acquires a pessimistic write lock on the
   * SevaType row so that concurrent requests for the same slot serialise here.
   * Without the lock, two simultaneous requests could both read count=N-1 (room for one),
   * then both insert, resulting in N+1 bookings for a slot with capacity N.
   *
   * Throws UnprocessableEntityException if the slot is full.
   */
  private async assertSlotAvailable(
    manager: EntityManager,
    templeId: string,
    sevaTypeId: string,
    sevaDate: string,
    timeSlot: string,
  ): Promise<void> {
    // Lock the SevaType row — serialises all concurrent booking attempts for this seva type
    const sevaType = await manager
      .createQueryBuilder(SevaType, 'st')
      .where('st.id = :sevaTypeId AND st.temple_id = :templeId', {
        sevaTypeId,
        templeId,
      })
      .setLock('pessimistic_write')
      .getOne();

    if (!sevaType) {
      throw new NotFoundException('Seva type not found');
    }

    // Find per-slot max from availableTimeSlots config; fall back to entity-level limit
    const slotConfig = sevaType.availableTimeSlots.find(
      (s) => s.time === timeSlot,
    );
    const maxBookings = slotConfig?.maxBookings ?? sevaType.maxBookingsPerSlot;

    // Count existing active bookings for this exact slot
    const activeCount = await manager
      .createQueryBuilder(SevaBooking, 'sb')
      .where(
        'sb.temple_id = :templeId AND sb.seva_type_id = :sevaTypeId AND sb.seva_date = :sevaDate AND sb.time_slot = :timeSlot AND sb.status IN (:...statuses)',
        {
          templeId,
          sevaTypeId,
          sevaDate,
          timeSlot,
          statuses: [
            SevaBookingStatus.CONFIRMED,
            SevaBookingStatus.PENDING_PAYMENT,
          ],
        },
      )
      .getCount();

    if (activeCount >= maxBookings) {
      throw new UnprocessableEntityException(
        `Slot ${timeSlot} on ${sevaDate} is fully booked (${activeCount}/${maxBookings})`,
      );
    }
  }
}
