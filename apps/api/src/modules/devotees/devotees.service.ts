import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Devotee } from '../../database/entities/devotee.entity';
import { Donation } from '../../database/entities/donation.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { isValidPan, maskPan } from '../../common/utils/pan.util';
import { FindOrCreateDevoteeDto } from './dto/find-or-create-devotee.dto';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';
import { ListDevoteesQueryDto } from './dto/list-devotees-query.dto';
import { PaginatedResult } from '@devaseva/types';

/**
 * Computed donation and seva statistics for a devotee.
 * These fields are never stored — they are calculated from the ledger tables on demand.
 */
export interface DevoteeStats {
  donationCount: number;
  /** Decimal string — use parseFloat() only when doing arithmetic. */
  totalDonated: string;
  lastDonationAt: Date | null;
  sevaCount: number;
}

/** Devotee record with computed stats attached and panNumberEncrypted stripped. */
export type DevoteeWithStats = Omit<Devotee, 'panNumberEncrypted'> & {
  stats: DevoteeStats;
  recentDonations: Donation[];
};

/** Safe devotee — panNumberEncrypted removed from all list/detail responses. */
export type SafeDevotee = Omit<Devotee, 'panNumberEncrypted'>;

/** SafeDevotee with computed donation/seva stats attached for list responses. */
export type SafeDevoteeWithStats = SafeDevotee & {
  totalDonationAmount: string;
  donationCount: number;
  lastDonationAt: Date | null;
  sevaCount: number;
};

/**
 * DevoteesService manages the devotee CRM.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (from JWT). Never from dto.
 * - panNumberEncrypted is NEVER returned in any service output.
 * - Raw PAN is only in memory during encrypt/re-encrypt operations.
 *
 * Atomicity:
 * - findOrCreate() uses INSERT ... ON CONFLICT DO NOTHING inside a transaction.
 *   This prevents duplicate devotee records under concurrent requests.
 */
@Injectable()
export class DevoteesService {
  private readonly logger = new Logger(DevoteesService.name);

  constructor(
    @InjectRepository(Devotee)
    private readonly devoteeRepo: Repository<Devotee>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(SevaBooking)
    private readonly sevaBookingRepo: Repository<SevaBooking>,
    private readonly encryptionUtil: EncryptionUtil,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Finds an existing devotee by (temple_id, phone) or creates a new one.
   *
   * Atomicity:
   *   INSERT ... ON CONFLICT DO NOTHING ensures only one row is ever created for a
   *   given (temple_id, phone) pair, even under concurrent requests.
   *   The subsequent SELECT always returns the canonical row.
   *
   * If the devotee already exists, the existing record is returned unchanged.
   * The caller should call update() separately if profile data needs merging.
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   * @param dto       Validated body containing at minimum name + phone.
   */
  async findOrCreate(
    templeId: string,
    dto: FindOrCreateDevoteeDto,
  ): Promise<SafeDevotee> {
    const devotee = await this.dataSource.transaction(async (manager) => {
      // INSERT ... ON CONFLICT (temple_id, phone) DO NOTHING
      // If the row already exists, this is a no-op; we still SELECT below.
      await manager
        .createQueryBuilder()
        .insert()
        .into(Devotee)
        .values({
          templeId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gotra: dto.gotra,
          nakshatra: dto.nakshatra,
        })
        .orIgnore() // ON CONFLICT DO NOTHING
        .execute();

      // Always SELECT the canonical row (whether we just inserted or it pre-existed)
      const row = await manager.findOne(Devotee, {
        where: { templeId, phone: dto.phone },
      });

      if (!row) {
        // Should never happen — insert + select in same transaction
        throw new Error(`findOrCreate: failed to resolve devotee for phone=${dto.phone}`);
      }

      return row;
    });

    this.logger.log(
      `findOrCreate: devotee ${devotee.id} resolved for temple ${templeId}`,
    );

    return this.stripEncryptedPan(devotee);
  }

  /**
   * Returns paginated devotees for a temple with computed donation/seva stats.
   * templeId guard is mandatory — never omit it.
   *
   * Search matches name OR phone using ILIKE (case-insensitive).
   *
   * Stats are computed via correlated subqueries in a single SQL round-trip:
   *   - totalDonationAmount: SUM(amount) WHERE devotee_id = d.id
   *   - donationCount:       COUNT(id)   WHERE devotee_id = d.id
   *   - lastDonationAt:      MAX(payment_date) WHERE devotee_id = d.id
   *   - sevaCount:           COUNT(id)   WHERE devotee_id = d.id (seva_bookings)
   * All subqueries are also guarded by temple_id and deleted_at IS NULL.
   */
  async findAll(
    templeId: string,
    query: ListDevoteesQueryDto,
  ): Promise<PaginatedResult<SafeDevoteeWithStats>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.devoteeRepo
      .createQueryBuilder('d')
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.deleted_at IS NULL')
      // Subquery: sum of confirmed donation amounts for this devotee
      .addSelect(
        `(SELECT COALESCE(SUM(don.amount::numeric), 0)
           FROM donations don
           WHERE don.devotee_id = d.id
             AND don.temple_id = :templeId
             AND don.deleted_at IS NULL)`,
        'totalDonationAmount',
      )
      // Subquery: number of donations
      .addSelect(
        `(SELECT COUNT(don.id)
           FROM donations don
           WHERE don.devotee_id = d.id
             AND don.temple_id = :templeId
             AND don.deleted_at IS NULL)`,
        'donationCount',
      )
      // Subquery: date of most recent donation
      .addSelect(
        `(SELECT MAX(don.payment_date)
           FROM donations don
           WHERE don.devotee_id = d.id
             AND don.temple_id = :templeId
             AND don.deleted_at IS NULL)`,
        'lastDonationAt',
      )
      // Subquery: number of seva bookings
      .addSelect(
        `(SELECT COUNT(sb.id)
           FROM seva_bookings sb
           WHERE sb.devotee_id = d.id
             AND sb.temple_id = :templeId
             AND sb.deleted_at IS NULL)`,
        'sevaCount',
      )
      .orderBy('d.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      qb.andWhere(
        '(d.name ILIKE :search OR d.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.tier) {
      qb.andWhere('d.tier = :tier', { tier: query.tier });
    }
    if (query.city) {
      qb.andWhere('d.city ILIKE :city', { city: `%${query.city}%` });
    }

    // getCount() strips SELECT/ORDER BY/LIMIT — the subqueries are not executed for the count
    const total = await qb.getCount();
    // getRawAndEntities() returns mapped entities + raw rows (which carry the extra aliases)
    const { entities, raw } = await qb.getRawAndEntities();

    const rows = entities.map((entity, i) => {
      const r = raw[i];
      return {
        ...this.stripEncryptedPan(entity),
        totalDonationAmount: parseFloat(r.totalDonationAmount ?? '0').toFixed(2),
        donationCount: parseInt(r.donationCount ?? '0', 10),
        lastDonationAt: r.lastDonationAt ? new Date(r.lastDonationAt as string) : null,
        sevaCount: parseInt(r.sevaCount ?? '0', 10),
      } satisfies SafeDevoteeWithStats;
    });

    return toPaginatedResult(rows, total, page, limit);
  }

  /**
   * Returns a single devotee with computed donation/seva stats and last 10 donations.
   *
   * Stats are computed via aggregate queries — NOT stored columns.
   * panNumberEncrypted is stripped from the returned object.
   *
   * @throws NotFoundException if the devotee does not exist for the given temple.
   */
  async findById(
    templeId: string,
    devoteeId: string,
  ): Promise<DevoteeWithStats> {
    const devotee = await this.devoteeRepo.findOne({
      where: { id: devoteeId, templeId },
    });

    if (!devotee) {
      throw new NotFoundException(`Devotee ${devoteeId} not found`);
    }

    // ── Compute donation stats (no stored columns) ────────────────────────────
    const statsRaw = await this.donationRepo
      .createQueryBuilder('don')
      .select('COUNT(don.id)', 'donationCount')
      .addSelect('COALESCE(SUM(don.amount::numeric), 0)', 'totalDonated')
      .addSelect('MAX(don.payment_date)', 'lastDonationAt')
      .where(
        'don.devotee_id = :devoteeId AND don.temple_id = :templeId AND don.deleted_at IS NULL',
        { devoteeId, templeId },
      )
      .getRawOne<{
        donationCount: string;
        totalDonated: string;
        lastDonationAt: string | null;
      }>();

    const sevaCount = await this.sevaBookingRepo
      .createQueryBuilder('sb')
      .where(
        'sb.devotee_id = :devoteeId AND sb.temple_id = :templeId AND sb.deleted_at IS NULL',
        { devoteeId, templeId },
      )
      .getCount();

    const stats: DevoteeStats = {
      donationCount: parseInt(statsRaw?.donationCount ?? '0', 10),
      totalDonated: parseFloat(statsRaw?.totalDonated ?? '0').toFixed(2),
      lastDonationAt: statsRaw?.lastDonationAt
        ? new Date(statsRaw.lastDonationAt)
        : null,
      sevaCount,
    };

    // ── Last 10 donations ─────────────────────────────────────────────────────
    const recentDonations = await this.donationRepo.find({
      where: { devoteeId, templeId },
      order: { paymentDate: 'DESC' },
      take: 10,
    });

    const safe = this.stripEncryptedPan(devotee);
    return { ...safe, stats, recentDonations };
  }

  /**
   * Updates mutable devotee fields.
   *
   * PAN handling:
   * - If `dto.pan` is provided, the new PAN is validated, encrypted (AES-256-GCM),
   *   and the masked value is regenerated. The old encrypted value is overwritten.
   * - If `dto.pan` is absent, the existing PAN is preserved unchanged.
   * - panNumberEncrypted is NEVER returned — only panNumberMasked.
   *
   * @throws NotFoundException if the devotee does not belong to the temple.
   * @throws UnprocessableEntityException if the provided PAN is structurally invalid.
   */
  async update(
    templeId: string,
    devoteeId: string,
    dto: UpdateDevoteeDto,
  ): Promise<SafeDevotee> {
    const devotee = await this.devoteeRepo.findOne({
      where: { id: devoteeId, templeId },
    });

    if (!devotee) {
      throw new NotFoundException(`Devotee ${devoteeId} not found`);
    }

    // ── PAN re-encryption ────────────────────────────────────────────────────
    let panEncrypted = devotee.panNumberEncrypted;
    let panMasked = devotee.panNumberMasked;

    if (dto.pan !== undefined) {
      const panUpper = dto.pan.toUpperCase();
      if (!isValidPan(panUpper)) {
        throw new UnprocessableEntityException('Invalid PAN format');
      }
      panEncrypted = this.encryptionUtil.encrypt(panUpper);
      panMasked = maskPan(panUpper);
    }

    const patch: Partial<Devotee> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.dateOfBirth !== undefined && {
        dateOfBirth: new Date(dto.dateOfBirth),
      }),
      ...(dto.anniversaryDate !== undefined && {
        anniversaryDate: new Date(dto.anniversaryDate),
      }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.pinCode !== undefined && { pinCode: dto.pinCode }),
      ...(dto.gotra !== undefined && { gotra: dto.gotra }),
      ...(dto.nakshatra !== undefined && { nakshatra: dto.nakshatra }),
      ...(dto.rashi !== undefined && { rashi: dto.rashi }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.familyHeadId !== undefined && { familyHeadId: dto.familyHeadId }),
      ...(dto.whatsappOptedOut !== undefined && {
        whatsappOptedOut: dto.whatsappOptedOut,
      }),
      ...(dto.smsOptedOut !== undefined && { smsOptedOut: dto.smsOptedOut }),
      ...(dto.memberSince !== undefined && {
        memberSince: new Date(dto.memberSince),
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      panNumberEncrypted: panEncrypted,
      panNumberMasked: panMasked,
    };

    await this.devoteeRepo.update(devoteeId, patch);

    this.logger.log(
      `Devotee ${devoteeId} updated for temple ${templeId}` +
        (dto.pan !== undefined ? ' [PAN re-encrypted]' : ''),
    );

    const updated = await this.devoteeRepo.findOne({
      where: { id: devoteeId, templeId },
    });

    // Should never be null — we just updated it
    return this.stripEncryptedPan(updated!);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Removes panNumberEncrypted from a Devotee before it leaves the service layer.
   * This is the security boundary — the encrypted PAN must never reach a controller.
   */
  private stripEncryptedPan(devotee: Devotee): SafeDevotee {
    // Create a shallow copy and remove the sensitive field
    const { panNumberEncrypted: _stripped, ...safe } = devotee;
    return safe as SafeDevotee;
  }
}
