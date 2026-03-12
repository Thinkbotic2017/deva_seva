import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Donation } from '../../database/entities/donation.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { Temple } from '../../database/entities/temple.entity';
import { FinanceService } from '../finance/finance.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { FiscalYearUtil } from '../../common/utils/fiscal-year.util';
import { ReceiptNumberUtil } from '../../common/utils/receipt-number.util';
import { S3Service } from '../../common/services/s3.service';
import { isValidPan, maskPan } from '../../common/utils/pan.util';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ListDonationsQueryDto } from './dto/list-donations-query.dto';
import { JOB_MAX_ATTEMPTS, JOB_BACKOFF_DELAY_MS } from '../../common/constants';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { DonationStatus, PaginatedResult } from '@devaseva/types';

/** Donation with an optional pre-signed receipt URL attached at serve time. */
export type DonationWithReceiptUrl = Donation & { receiptUrl?: string };

/**
 * DonationsService is the core revenue service.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
 * - Raw PAN is NEVER persisted — only AES-256-GCM ciphertext and the masked value.
 * - receipt_pdf_s3_key is stored as an S3 key only; pre-signed URL is generated per-request.
 * - Donation + finance_ledger rows are created in a single DB transaction.
 * - Receipt queue job is fired AFTER the transaction commits.
 *
 * Financial invariants:
 * - amount is stored as decimal(12,2) via toFixed(2). Never use float arithmetic on amounts.
 * - Receipt numbers are generated via Redis INCR (atomic) after the transaction commits.
 * - The finance_ledger is APPEND-ONLY — see FinanceService.autoPostIncome().
 */
@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(DonationCategory)
    private readonly categoryRepo: Repository<DonationCategory>,
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    @InjectQueue('receipt_generation')
    private readonly receiptQueue: Queue,
    private readonly financeService: FinanceService,
    private readonly encryptionUtil: EncryptionUtil,
    private readonly fiscalYearUtil: FiscalYearUtil,
    private readonly receiptNumberUtil: ReceiptNumberUtil,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a donation and auto-posts the matching income entry to the finance ledger.
   * All DB writes happen inside a single transaction.
   * Receipt number is generated via Redis after the transaction (atomic, no collision risk).
   * Receipt PDF generation is queued after commit — not inside the transaction.
   *
   * @param templeId  Must come from req.user.templeId (JWT). NEVER from dto.
   * @param dto       Validated request body.
   * @param recordedBy  userId of the staff member who recorded this donation.
   */
  async create(
    templeId: string,
    dto: CreateDonationDto,
    recordedBy: string,
  ): Promise<Donation> {
    // Validate and encrypt PAN before entering the transaction
    let panEncrypted: string | undefined;
    let panMasked: string | undefined;
    if (dto.pan) {
      const panUpper = dto.pan.toUpperCase();
      if (!isValidPan(panUpper)) {
        throw new UnprocessableEntityException('Invalid PAN format');
      }
      panEncrypted = this.encryptionUtil.encrypt(panUpper);
      panMasked = maskPan(panUpper);
    }

    const paymentDate = new Date(dto.paymentDate);
    const fiscalYear = this.fiscalYearUtil.fromDate(paymentDate);
    const amountStr = Number(dto.amount).toFixed(2);

    // Check 80G eligibility: temple must be registered AND category must be eligible
    const is80gEligible = await this.check80gEligibility(templeId, dto.categoryId);

    // ── Atomic transaction: donation + ledger entry ───────────────────────────
    const savedDonation = await this.dataSource.transaction(async (manager) => {
      const donation = manager.create(Donation, {
        templeId,                          // Always from parameter — never from dto
        categoryId: dto.categoryId,
        devoteeId: dto.devoteeId,
        donorName: dto.donorName,
        donorPhone: dto.donorPhone,
        donorPanEncrypted: panEncrypted,
        donorPanMasked: panMasked,
        amount: amountStr,
        mode: dto.mode,
        status: DonationStatus.CONFIRMED,
        is80gEligible,
        isAnonymous: dto.isAnonymous ?? false,
        paymentReference: dto.paymentReference,
        paymentDate,
        fiscalYear,
        recordedBy,
        notes: dto.notes,
      });

      const inserted = await manager.save(donation);

      // Auto-post income to finance ledger (append-only — never updates)
      await this.financeService.autoPostIncome(manager, {
        templeId,
        amount: amountStr,
        entryDate: paymentDate,
        description: `Donation — ${dto.donorName}`,
        donationId: inserted.id,
        recordedBy,
        fiscalYear,
      });

      return inserted;
    });
    // ── End transaction ───────────────────────────────────────────────────────

    // Generate receipt number AFTER the transaction (Redis INCR is atomic)
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    const prefix = temple?.receiptPrefix ?? 'RCPT';
    const receiptNumber = await this.receiptNumberUtil.next(
      templeId,
      fiscalYear,
      prefix,
    );

    await this.donationRepo.update(savedDonation.id, { receiptNumber });
    savedDonation.receiptNumber = receiptNumber;

    // Queue receipt PDF generation (async — not part of the user-facing request)
    await this.receiptQueue.add(
      'generate',
      { donationId: savedDonation.id },
      {
        priority: 1,
        attempts: JOB_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
      },
    );

    this.logger.log(
      `Donation ${savedDonation.id} created for temple ${templeId} [receipt=${receiptNumber}]`,
    );

    return savedDonation;
  }

  /**
   * Returns paginated donations for a temple.
   * templeId guard is mandatory on every query — never query without it.
   */
  async findAll(
    templeId: string,
    query: ListDonationsQueryDto,
  ): Promise<PaginatedResult<Donation>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.donationRepo
      .createQueryBuilder('d')
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.deleted_at IS NULL')
      .orderBy('d.payment_date', 'DESC')
      .addOrderBy('d.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.fromDate) {
      qb.andWhere('d.payment_date >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('d.payment_date <= :toDate', { toDate: query.toDate });
    }
    if (query.categoryId) {
      qb.andWhere('d.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.mode) {
      qb.andWhere('d.mode = :mode', { mode: query.mode });
    }
    if (query.status) {
      qb.andWhere('d.status = :status', { status: query.status });
    }
    if (query.fiscalYear) {
      qb.andWhere('d.fiscal_year = :fiscalYear', {
        fiscalYear: query.fiscalYear,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(d.donor_name ILIKE :search OR d.donor_phone ILIKE :search OR d.receipt_number ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return toPaginatedResult(data, total, page, limit);
  }

  /**
   * Returns a single donation scoped to the temple.
   * If receipt_pdf_s3_key is set, attaches a pre-signed URL (1hr TTL).
   * Throws NotFoundException if not found or templeId mismatch.
   */
  async findById(
    templeId: string,
    donationId: string,
  ): Promise<DonationWithReceiptUrl> {
    const donation = await this.donationRepo.findOne({
      where: { id: donationId, templeId },
    });

    if (!donation) {
      throw new NotFoundException(`Donation ${donationId} not found`);
    }

    const result = donation as DonationWithReceiptUrl;
    if (donation.receiptPdfS3Key) {
      result.receiptUrl = await this.s3Service.getPresignedUrl(
        donation.receiptPdfS3Key,
      );
    }

    return result;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * 80G eligibility requires BOTH conditions:
   *   1. Temple has valid 80G registration (is_80g_registered = true).
   *   2. The selected donation category is marked as 80G eligible.
   * Returns false if either record is not found.
   */
  private async check80gEligibility(
    templeId: string,
    categoryId: string,
  ): Promise<boolean> {
    const [temple, category] = await Promise.all([
      this.templeRepo.findOne({ where: { id: templeId } }),
      this.categoryRepo.findOne({ where: { id: categoryId, templeId } }),
    ]);

    if (!temple || !category) return false;
    return temple.is80gRegistered && category.is80gEligible;
  }
}
