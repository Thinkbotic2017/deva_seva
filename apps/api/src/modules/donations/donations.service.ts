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
import { RazorpayService, RazorpayOrder } from '../razorpay/razorpay.service';
import { InitiateOnlineDonationDto } from './dto/initiate-online-donation.dto';
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
import { CreateDonationCategoryDto } from './dto/create-donation-category.dto';
import { UpdateDonationCategoryDto } from './dto/update-donation-category.dto';
import { ListDonationsQueryDto } from './dto/list-donations-query.dto';
import { JOB_MAX_ATTEMPTS, JOB_BACKOFF_DELAY_MS } from '../../common/constants';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { DonationMode, DonationStatus, PaginatedResult } from '@devaseva/types';

/** Result returned to the client after a Razorpay order is created. */
export interface InitiateOnlineResult {
  razorpayOrderId: string;
  razorpayKeyId: string;
  /** Amount in paise — use directly with the Razorpay checkout SDK. */
  amountPaise: number;
  donationId: string;
}

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
    private readonly razorpayService: RazorpayService,
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

  // ─── Online donations (Razorpay) ──────────────────────────────────────────

  /**
   * Creates a PENDING donation record and a Razorpay order for online payment.
   * The temple is identified by slug (public endpoint — no JWT).
   * Returns the Razorpay order details the client needs to open the checkout modal.
   */
  async initiateOnlinePayment(
    dto: InitiateOnlineDonationDto,
  ): Promise<InitiateOnlineResult> {
    const temple = await this.templeRepo.findOne({
      where: { slug: dto.templeSlug, isActive: true },
    });
    if (!temple) {
      throw new NotFoundException(`Temple '${dto.templeSlug}' not found`);
    }

    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, templeId: temple.id, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Donation category not found');
    }

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

    const amountStr = Number(dto.amount).toFixed(2);
    const paymentDate = new Date();
    const fiscalYear = this.fiscalYearUtil.fromDate(paymentDate);
    const is80gEligible = temple.is80gRegistered && category.is80gEligible;

    // Create a PENDING donation first so we have an ID for the Razorpay receipt field
    const pendingDonation = await this.donationRepo.save(
      this.donationRepo.create({
        templeId: temple.id,
        categoryId: dto.categoryId,
        donorName: dto.donorName,
        donorPhone: dto.donorPhone,
        donorPanEncrypted: panEncrypted,
        donorPanMasked: panMasked,
        amount: amountStr,
        mode: DonationMode.ONLINE,
        status: DonationStatus.PENDING,
        is80gEligible,
        isAnonymous: false,
        paymentDate,
        fiscalYear,
      }),
    );

    // Create Razorpay order — use donation ID as receipt correlation ID
    let order: RazorpayOrder;
    try {
      order = await this.razorpayService.createOrder(
        Number(dto.amount),
        pendingDonation.id,
      );
    } catch (err: unknown) {
      // Clean up the PENDING donation if Razorpay order creation fails
      await this.donationRepo.softDelete(pendingDonation.id);
      throw err;
    }

    // Persist the Razorpay order ID on the donation
    await this.donationRepo.update(pendingDonation.id, {
      razorpayOrderId: order.id,
    });

    this.logger.log(
      `Online donation initiated: donationId=${pendingDonation.id} orderId=${order.id}`,
    );

    return {
      razorpayOrderId: order.id,
      razorpayKeyId: this.razorpayService.keyId,
      amountPaise: order.amount,
      donationId: pendingDonation.id,
    };
  }

  /**
   * Finds a donation by Razorpay order ID.
   * Returns null if not found — callers decide whether to throw.
   * Used by the webhook handler and the by-order polling endpoint.
   */
  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Donation | null> {
    return this.donationRepo.findOne({ where: { razorpayOrderId } }) ?? null;
  }

  /**
   * Confirms a PENDING donation after Razorpay payment.captured webhook.
   * Idempotent: already-confirmed donations are silently skipped.
   *
   * Within a single transaction:
   *   1. Updates donation status → CONFIRMED and sets payment metadata.
   *   2. Posts an INCOME entry to the finance ledger.
   * After the transaction:
   *   3. Generates receipt number (Redis INCR).
   *   4. Queues receipt PDF generation.
   */
  async confirmOnlinePayment(
    donationId: string,
    razorpayPaymentId: string,
    captureDate: Date,
  ): Promise<void> {
    const donation = await this.donationRepo.findOne({
      where: { id: donationId },
    });

    if (!donation) {
      this.logger.warn(`confirmOnlinePayment: donation ${donationId} not found`);
      return;
    }

    // Idempotency: skip if already progressed past PENDING
    if (
      donation.status === DonationStatus.CONFIRMED ||
      donation.status === DonationStatus.RECEIPT_GENERATED ||
      donation.status === DonationStatus.RECEIPT_SENT
    ) {
      this.logger.log(
        `confirmOnlinePayment: donation ${donationId} already ${donation.status} — skipping`,
      );
      return;
    }

    const fiscalYear = this.fiscalYearUtil.fromDate(captureDate);

    // Atomic: update donation + post to ledger
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Donation, donationId, {
        status: DonationStatus.CONFIRMED,
        razorpayPaymentId,
        paymentDate: captureDate,
        fiscalYear,
      });

      await this.financeService.autoPostIncome(manager, {
        templeId: donation.templeId,
        amount: donation.amount,
        entryDate: captureDate,
        description: `Online donation — ${donation.donorName}`,
        donationId,
        fiscalYear,
      });
    });

    // Generate receipt number after commit
    const temple = await this.templeRepo.findOne({
      where: { id: donation.templeId },
    });
    const prefix = temple?.receiptPrefix ?? 'RCPT';
    const receiptNumber = await this.receiptNumberUtil.next(
      donation.templeId,
      fiscalYear,
      prefix,
    );
    await this.donationRepo.update(donationId, { receiptNumber });

    // Queue receipt PDF generation
    await this.receiptQueue.add(
      'generate',
      { donationId },
      {
        priority: 1,
        attempts: JOB_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
      },
    );

    this.logger.log(
      `Online donation ${donationId} confirmed [receipt=${receiptNumber}]`,
    );
  }

  /**
   * Cancels a PENDING donation after payment.failed webhook.
   * Idempotent: already-cancelled donations are silently skipped.
   * Does NOT cancel CONFIRMED donations — out-of-order events must not undo confirmed payments.
   */
  async cancelDonation(donationId: string): Promise<void> {
    const donation = await this.donationRepo.findOne({
      where: { id: donationId },
    });

    if (!donation) {
      this.logger.warn(`cancelDonation: donation ${donationId} not found`);
      return;
    }

    if (donation.status === DonationStatus.CANCELLED) {
      return; // Already cancelled — idempotent
    }

    if (donation.status !== DonationStatus.PENDING) {
      // Confirmed/Receipt generated — do not cancel
      this.logger.warn(
        `cancelDonation: donation ${donationId} is ${donation.status} — refusing to cancel confirmed donation`,
      );
      return;
    }

    await this.donationRepo.update(donationId, {
      status: DonationStatus.CANCELLED,
    });

    this.logger.log(`Donation ${donationId} cancelled (payment failed)`);
  }

  /**
   * Re-queues receipt PDF generation (and downstream WhatsApp delivery) for a donation.
   * Requires the donation to belong to the calling user's temple.
   * The receipt_generation job is idempotent — safe to queue multiple times.
   */
  async resendReceipt(templeId: string, donationId: string): Promise<void> {
    const donation = await this.donationRepo.findOne({
      where: { id: donationId, templeId },
    });

    if (!donation) {
      throw new NotFoundException(`Donation ${donationId} not found`);
    }

    if (
      donation.status !== DonationStatus.CONFIRMED &&
      donation.status !== DonationStatus.RECEIPT_GENERATED &&
      donation.status !== DonationStatus.RECEIPT_SENT
    ) {
      throw new UnprocessableEntityException(
        'Receipt can only be resent for confirmed donations',
      );
    }

    await this.receiptQueue.add(
      'generate',
      { donationId },
      {
        priority: 1,
        attempts: JOB_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
      },
    );

    this.logger.log(`Receipt resend queued for donation ${donationId}`);
  }

  /**
   * Returns all active donation categories for the temple, ordered by sort_order ASC.
   * Used to populate the category dropdown in the counter UI.
   * templeId is mandatory — never query without it.
   */
  async findCategories(templeId: string): Promise<DonationCategory[]> {
    return this.categoryRepo.find({
      where: { templeId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Returns ALL categories for the temple (active + inactive, excluding soft-deleted).
   * Used by the Settings page for category management.
   */
  async findAllCategories(templeId: string): Promise<DonationCategory[]> {
    return this.categoryRepo.find({
      where: { templeId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Creates a new donation category scoped to the temple.
   * templeId ALWAYS comes from the JWT — never from the request body.
   */
  async createCategory(
    templeId: string,
    dto: CreateDonationCategoryDto,
  ): Promise<DonationCategory> {
    const category = this.categoryRepo.create({
      templeId,
      name: dto.name,
      description: dto.description,
      is80gEligible: dto.is80gEligible ?? false,
      color: dto.color ?? '#E8530A',
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
    });
    const saved = await this.categoryRepo.save(category);
    this.logger.log(`Category '${saved.name}' created for temple ${templeId}`);
    return saved;
  }

  /**
   * Updates a category. Only fields present in the DTO are changed.
   * Throws NotFoundException if the category doesn't belong to this temple.
   */
  async updateCategory(
    templeId: string,
    categoryId: string,
    dto: UpdateDonationCategoryDto,
  ): Promise<DonationCategory> {
    const existing = await this.categoryRepo.findOne({
      where: { id: categoryId, templeId },
    });
    if (!existing) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    await this.categoryRepo.update(categoryId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.is80gEligible !== undefined && { is80gEligible: dto.is80gEligible }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    const updated = await this.categoryRepo.findOne({
      where: { id: categoryId, templeId },
    });
    if (!updated) {
      throw new NotFoundException(`Category ${categoryId} not found after update`);
    }

    this.logger.log(`Category ${categoryId} updated for temple ${templeId}`);
    return updated;
  }

  /**
   * Soft-deletes a donation category (sets deleted_at).
   * Historical donations that reference this category are unaffected.
   * Throws NotFoundException if the category doesn't belong to this temple.
   */
  async deleteCategory(templeId: string, categoryId: string): Promise<void> {
    const existing = await this.categoryRepo.findOne({
      where: { id: categoryId, templeId },
    });
    if (!existing) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
    await this.categoryRepo.softDelete(categoryId);
    this.logger.log(`Category ${categoryId} soft-deleted for temple ${templeId}`);
  }

  /**
   * Links an existing devotee record to a donation (post-creation).
   * Used when a new devotee is registered immediately after a cash donation.
   * Scoped by templeId — cannot link a devotee to another temple's donation.
   */
  async linkDevotee(
    templeId: string,
    donationId: string,
    devoteeId: string,
  ): Promise<void> {
    const donation = await this.donationRepo.findOne({
      where: { id: donationId, templeId },
    });

    if (!donation) {
      throw new NotFoundException(`Donation ${donationId} not found`);
    }

    await this.donationRepo.update(donationId, { devoteeId });
    this.logger.log(`Donation ${donationId} linked to devotee ${devoteeId}`);
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
