import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { FinanceCategory } from '../../database/entities/finance-category.entity';
import { S3Service } from '../../common/services/s3.service';
import { FinanceCategoryType } from '@devaseva/types';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';

/** Public temple profile — excludes Razorpay secrets. */
export type TempleProfile = Omit<Temple, 'razorpayKeySecret'>;

/** Seeded donation categories applied to every new temple. */
const SEED_DONATION_CATEGORIES: Array<{
  name: string;
  is80gEligible: boolean;
  sortOrder: number;
}> = [
  { name: 'General Donation', is80gEligible: false, sortOrder: 0 },
  { name: 'Annadanam',        is80gEligible: true,  sortOrder: 1 },
  { name: 'Temple Renovation', is80gEligible: true, sortOrder: 2 },
  { name: 'Festival',          is80gEligible: false, sortOrder: 3 },
  { name: 'Cow Protection',    is80gEligible: true,  sortOrder: 4 },
];

/** Seeded finance categories (income + expense). */
const SEED_FINANCE_CATEGORIES: Array<{
  name: string;
  type: FinanceCategoryType;
  sortOrder: number;
}> = [
  { name: 'Donations',       type: FinanceCategoryType.INCOME,  sortOrder: 0 },
  { name: 'Seva Bookings',   type: FinanceCategoryType.INCOME,  sortOrder: 1 },
  { name: 'Other Income',    type: FinanceCategoryType.INCOME,  sortOrder: 2 },
  { name: 'Puja Materials',  type: FinanceCategoryType.EXPENSE, sortOrder: 0 },
  { name: 'Salaries',        type: FinanceCategoryType.EXPENSE, sortOrder: 1 },
  { name: 'Maintenance',     type: FinanceCategoryType.EXPENSE, sortOrder: 2 },
  { name: 'Utilities',       type: FinanceCategoryType.EXPENSE, sortOrder: 3 },
  { name: 'Other Expense',   type: FinanceCategoryType.EXPENSE, sortOrder: 4 },
];

/**
 * TempleService manages temple creation, profile updates, and onboarding seeding.
 *
 * Security invariants:
 * - create() is SUPER_ADMIN only — enforced by @Roles() on the controller.
 * - update() scopes writes to the calling user's templeId from JWT.
 * - razorpayKeySecret is NEVER included in getProfile() responses.
 * - logo_url and banner_url store S3 keys only; pre-signed URLs generated at serve time.
 */
@Injectable()
export class TempleService {
  private readonly logger = new Logger(TempleService.name);

  constructor(
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    @InjectRepository(DonationCategory)
    private readonly donationCategoryRepo: Repository<DonationCategory>,
    @InjectRepository(FinanceCategory)
    private readonly financeCategoryRepo: Repository<FinanceCategory>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new temple and seeds default categories atomically.
   *
   * Seeds inside the same transaction:
   *   - 5 donation categories (General Donation, Annadanam, Temple Renovation, Festival, Cow Protection)
   *   - 8 finance categories (3 income + 5 expense), all flagged isSystem=true
   *
   * Throws ConflictException if the slug is already taken.
   * Only callable by SUPER_ADMIN — guard enforced at controller level.
   */
  async create(dto: CreateTempleDto): Promise<Temple> {
    const existing = await this.templeRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug '${dto.slug}' is already taken`);
    }

    const temple = await this.dataSource.transaction(async (manager) => {
      const newTemple = manager.create(Temple, {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pinCode: dto.pinCode,
        isActive: true,
        is80gRegistered: false,
        settings: {},
        timezone: 'Asia/Kolkata',
        primaryLanguage: 'hi',
      });

      const savedTemple = await manager.save(newTemple);

      // Seed donation categories
      await this.seedDonationCategories(manager, savedTemple.id);

      // Seed finance categories
      await this.seedFinanceCategories(manager, savedTemple.id);

      this.logger.log(`Temple '${savedTemple.slug}' created [id=${savedTemple.id}]`);
      return savedTemple;
    });

    return temple;
  }

  /**
   * Updates allowed temple profile fields.
   * templeId comes from the caller's JWT — never from the request body.
   * razorpayKeySecret and plan can only be changed by SUPER_ADMIN via a separate flow.
   */
  async update(templeId: string, dto: UpdateTempleDto): Promise<TempleProfile> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) {
      throw new NotFoundException('Temple not found');
    }

    // Build a safe update object — only allowed fields
    const updates: Partial<Temple> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.pinCode !== undefined && { pinCode: dto.pinCode }),
      ...(dto.phonePrimary !== undefined && { phonePrimary: dto.phonePrimary }),
      ...(dto.phoneWhatsapp !== undefined && { phoneWhatsapp: dto.phoneWhatsapp }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
      ...(dto.panNumber !== undefined && { panNumber: dto.panNumber }),
      ...(dto.trustRegNumber !== undefined && { trustRegNumber: dto.trustRegNumber }),
      ...(dto.number80g !== undefined && { number80g: dto.number80g }),
      ...(dto.number80gExpiry !== undefined && { number80gExpiry: new Date(dto.number80gExpiry) }),
      ...(dto.is80gRegistered !== undefined && { is80gRegistered: dto.is80gRegistered }),
      ...(dto.fcraNumber !== undefined && { fcraNumber: dto.fcraNumber }),
      ...(dto.receiptPrefix !== undefined && { receiptPrefix: dto.receiptPrefix }),
      ...(dto.upiId !== undefined && { upiId: dto.upiId }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.primaryLanguage !== undefined && { primaryLanguage: dto.primaryLanguage }),
    };

    await this.templeRepo.update(templeId, updates as Parameters<typeof this.templeRepo.update>[1]);

    // Return updated profile (without secret fields)
    return this.getProfile(templeId);
  }

  /**
   * Returns the temple profile, excluding razorpayKeySecret.
   * logo_url and banner_url are S3 keys — pre-signed URLs generated here.
   */
  async getProfile(templeId: string): Promise<TempleProfile> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) {
      throw new NotFoundException('Temple not found');
    }

    // Generate pre-signed URLs for media if S3 keys are present
    if (temple.logoUrl) {
      (temple as unknown as Record<string, unknown>)['logoUrl'] =
        await this.s3Service.getPresignedUrl(temple.logoUrl);
    }
    if (temple.bannerUrl) {
      (temple as unknown as Record<string, unknown>)['bannerUrl'] =
        await this.s3Service.getPresignedUrl(temple.bannerUrl);
    }

    // Strip secret before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { razorpayKeySecret: _secret, ...profile } = temple;
    return profile as TempleProfile;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Seeds the 5 default donation categories for a new temple within a transaction. */
  private async seedDonationCategories(
    manager: EntityManager,
    templeId: string,
  ): Promise<void> {
    const categories = SEED_DONATION_CATEGORIES.map((seed) =>
      manager.create(DonationCategory, {
        templeId,
        name: seed.name,
        is80gEligible: seed.is80gEligible,
        isActive: true,
        sortOrder: seed.sortOrder,
      }),
    );
    await manager.save(DonationCategory, categories);
  }

  /** Seeds the default income + expense finance categories for a new temple. */
  private async seedFinanceCategories(
    manager: EntityManager,
    templeId: string,
  ): Promise<void> {
    const categories = SEED_FINANCE_CATEGORIES.map((seed) =>
      manager.create(FinanceCategory, {
        templeId,
        name: seed.name,
        type: seed.type,
        isSystem: true,
        sortOrder: seed.sortOrder,
      }),
    );
    await manager.save(FinanceCategory, categories);
  }
}
