import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { SevaType } from '../../database/entities/seva-type.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { DonationsService, InitiateOnlineResult } from '../donations/donations.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { FiscalYearUtil } from '../../common/utils/fiscal-year.util';
import { ReceiptNumberUtil } from '../../common/utils/receipt-number.util';
import { SevaBookingStatus, SevaBookingPaymentMode } from '@devaseva/types';
import { RAZORPAY_PAISE_MULTIPLIER } from '../../common/constants';
import { PublicDonateDto } from './dto/public-donate.dto';
import { PublicSevaDto } from './dto/public-seva.dto';

/** Result returned after a Razorpay seva order is created. */
export interface InitiateSevaResult {
  razorpayOrderId: string;
  razorpayKeyId: string;
  /** Amount in paise — pass directly to Razorpay checkout SDK. */
  amountPaise: number;
  bookingId: string;
}

/** Shape returned by GET /public/:slug */
export interface PublicPortalData {
  temple: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    city?: string;
    state?: string;
    upiId?: string;
    razorpayKeyId?: string;
  };
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    is80gEligible: boolean;
  }>;
  sevaTypes: Array<{
    id: string;
    name: string;
    nameHi?: string;
    description?: string;
    pricingTiers: unknown;
    availableTimeSlots: unknown;
    durationMinutes: number;
    requiresSankalpa: boolean;
    imageUrl?: string;
  }>;
}

/**
 * PublicService handles all unauthenticated portal requests.
 *
 * Security invariants:
 * - templeId NEVER comes from the client — always derived from slug → DB lookup.
 * - These endpoints are intentionally read-only or payment-initiation only.
 * - No donor PII (PAN, phone) is returned in responses.
 */
@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    @InjectRepository(DonationCategory)
    private readonly categoryRepo: Repository<DonationCategory>,
    @InjectRepository(SevaType)
    private readonly sevaTypeRepo: Repository<SevaType>,
    @InjectRepository(SevaBooking)
    private readonly bookingRepo: Repository<SevaBooking>,
    private readonly donationsService: DonationsService,
    private readonly razorpayService: RazorpayService,
    private readonly fiscalYearUtil: FiscalYearUtil,
    private readonly receiptNumberUtil: ReceiptNumberUtil,
  ) {}

  /**
   * Returns the public portal data for a temple identified by slug.
   * Exposed via GET /api/v1/public/:slug — no auth required.
   */
  async getPortalData(slug: string): Promise<PublicPortalData> {
    const temple = await this.templeRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!temple) throw new NotFoundException(`Temple '${slug}' not found`);

    const [categories, sevaTypes] = await Promise.all([
      this.categoryRepo.find({
        where: { templeId: temple.id, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.sevaTypeRepo.find({
        where: { templeId: temple.id, isActive: true, isOnlineBookable: true },
        order: { sortOrder: 'ASC' },
      }),
    ]);

    return {
      temple: {
        id: temple.id,
        name: temple.name,
        slug: temple.slug,
        description: temple.description ?? undefined,
        logoUrl: temple.logoUrl ?? undefined,
        city: temple.city ?? undefined,
        state: temple.state ?? undefined,
        upiId: temple.upiId ?? undefined,
        razorpayKeyId: temple.razorpayKeyId ?? undefined,
      },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        is80gEligible: c.is80gEligible,
      })),
      sevaTypes: sevaTypes.map((s) => ({
        id: s.id,
        name: s.name,
        nameHi: s.nameHi ?? undefined,
        description: s.description ?? undefined,
        pricingTiers: s.pricingTiers,
        availableTimeSlots: s.availableTimeSlots,
        durationMinutes: s.durationMinutes,
        requiresSankalpa: s.requiresSankalpa,
        imageUrl: s.imageUrl ?? undefined,
      })),
    };
  }

  /**
   * Initiates an online donation for a temple identified by slug.
   * Delegates to DonationsService.initiateOnlinePayment.
   * Razorpay SDK errors are caught and re-thrown as UnprocessableEntityException
   * so the client receives a readable error message.
   */
  async initiateDonate(slug: string, dto: PublicDonateDto): Promise<InitiateOnlineResult> {
    try {
      return await this.donationsService.initiateOnlinePayment({
        templeSlug: slug,
        categoryId: dto.categoryId,
        donorName: dto.donorName,
        donorPhone: dto.donorPhone,
        amount: dto.amount,
        pan: dto.pan,
      });
    } catch (err: unknown) {
      // Re-throw NestJS exceptions as-is; wrap raw Razorpay SDK errors.
      if (err instanceof UnprocessableEntityException || err instanceof NotFoundException) {
        throw err;
      }
      const razorpayDesc =
        (err as Record<string, unknown> | null)?.['error'] as Record<string, string> | undefined;
      const message = razorpayDesc?.description ?? (err instanceof Error ? err.message : 'Payment service error');
      this.logger.error(`Razorpay order creation failed for slug=${slug}: ${message}`);
      throw new UnprocessableEntityException(message);
    }
  }

  /**
   * Creates a PENDING_PAYMENT seva booking and a Razorpay order.
   * The temple is identified by slug — templeId is never accepted from the client.
   * Returns the Razorpay order details required to open the checkout modal.
   */
  async initiateSeva(slug: string, dto: PublicSevaDto): Promise<InitiateSevaResult> {
    const temple = await this.templeRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!temple) throw new NotFoundException(`Temple '${slug}' not found`);

    const sevaType = await this.sevaTypeRepo.findOne({
      where: { id: dto.sevaTypeId, templeId: temple.id, isActive: true, isOnlineBookable: true },
    });
    if (!sevaType) throw new NotFoundException('Seva type not found or not available for online booking');

    const amountStr = Number(dto.amount).toFixed(2);
    const sevaDateObj = new Date(dto.sevaDate);
    const fiscalYear = this.fiscalYearUtil.fromDate(sevaDateObj);

    // Create PENDING_PAYMENT booking first — need an ID for the Razorpay receipt field
    let booking: SevaBooking;
    try {
      booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          templeId: temple.id,
          sevaTypeId: dto.sevaTypeId,
          devoteeName: dto.devoteeName,
          devoteePhone: dto.devoteePhone,
          sevaDate: dto.sevaDate,
          timeSlot: dto.timeSlot,
          tierName: dto.tierName,
          amount: amountStr,
          paymentMode: SevaBookingPaymentMode.ONLINE,
          status: SevaBookingStatus.PENDING_PAYMENT,
          sankalphaName: dto.sankalpaName,
          gotra: dto.gotra,
          nakshatra: dto.nakshatra,
          sankalpaPurpose: dto.sankalpaPurpose,
          additionalNames: dto.additionalNames ?? [],
          fiscalYear,
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to create pending seva booking for temple ${temple.id}`, err);
      throw err;
    }

    // Create Razorpay order — use booking ID as receipt correlation ID
    let razorpayOrder;
    try {
      razorpayOrder = await this.razorpayService.createOrder(Number(dto.amount), booking.id);
    } catch (err: unknown) {
      // Clean up the PENDING booking if Razorpay fails
      await this.bookingRepo.softDelete(booking.id);
      const razorpayDesc =
        (err as Record<string, unknown> | null)?.['error'] as Record<string, string> | undefined;
      const message = razorpayDesc?.description ?? (err instanceof Error ? err.message : 'Payment service error');
      this.logger.error(`Razorpay order creation failed for booking ${booking.id}: ${message}`);
      throw new UnprocessableEntityException(message);
    }

    // Persist razorpay order ID on the booking
    await this.bookingRepo.update(booking.id, { razorpayOrderId: razorpayOrder.id });

    this.logger.log(
      `Online seva initiated: bookingId=${booking.id} orderId=${razorpayOrder.id} temple=${temple.id}`,
    );

    return {
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: this.razorpayService.keyId,
      amountPaise: Math.round(Number(dto.amount) * RAZORPAY_PAISE_MULTIPLIER),
      bookingId: booking.id,
    };
  }
}
