import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SevaType } from '../../database/entities/seva-type.entity';
import { PricingTier, TimeSlot } from '@devaseva/types';
import { CreateSevaTypeDto } from './dto/create-seva-type.dto';
import { UpdateSevaTypeDto } from './dto/update-seva-type.dto';

/**
 * SevaTypeService manages the catalogue of seva types for a temple.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
 * - All queries include WHERE temple_id = templeId.
 */
@Injectable()
export class SevaTypeService {
  private readonly logger = new Logger(SevaTypeService.name);

  constructor(
    @InjectRepository(SevaType)
    private readonly sevaTypeRepo: Repository<SevaType>,
  ) {}

  /**
   * Returns all seva types for a temple.
   * By default returns only active types. Pass includeInactive=true for admin/settings view.
   */
  async findAll(templeId: string, includeInactive = false): Promise<SevaType[]> {
    const where: Record<string, unknown> = { templeId };
    if (!includeInactive) {
      where['isActive'] = true;
    }

    return this.sevaTypeRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Returns a single seva type scoped to the temple.
   * Throws NotFoundException if not found or templeId mismatch.
   */
  async findById(templeId: string, id: string): Promise<SevaType> {
    const sevaType = await this.sevaTypeRepo.findOne({ where: { id, templeId } });
    if (!sevaType) {
      throw new NotFoundException(`Seva type ${id} not found`);
    }
    return sevaType;
  }

  /**
   * Creates a new seva type for the temple.
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   */
  async create(templeId: string, dto: CreateSevaTypeDto): Promise<SevaType> {
    const sevaType = this.sevaTypeRepo.create({
      templeId,
      name: dto.name,
      nameHi: dto.nameHi,
      description: dto.description,
      durationMinutes: dto.durationMinutes ?? 60,
      frequency: dto.frequency,
      pricingTiers: dto.pricingTiers ?? [],
      maxBookingsPerSlot: dto.maxBookingsPerSlot ?? 1,
      advanceBookingDays: dto.advanceBookingDays ?? 30,
      requiresSankalpa: dto.requiresSankalpa ?? false,
      isOnlineBookable: dto.isOnlineBookable ?? false,
      availableDays: dto.availableDays ?? [0, 1, 2, 3, 4, 5, 6],
      availableTimeSlots: dto.availableTimeSlots ?? [],
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await this.sevaTypeRepo.save(sevaType);
    this.logger.log(`Seva type ${saved.id} created for temple ${templeId}`);
    return saved;
  }

  /**
   * Updates an existing seva type.
   * Only fields present in the dto are updated (partial update).
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   */
  async update(templeId: string, id: string, dto: UpdateSevaTypeDto): Promise<SevaType> {
    const sevaType = await this.findById(templeId, id);

    // Apply only the provided fields
    const {
      name, nameHi, description, durationMinutes, frequency,
      pricingTiers, maxBookingsPerSlot, advanceBookingDays,
      requiresSankalpa, isOnlineBookable, availableDays,
      availableTimeSlots, sortOrder, isActive,
    } = dto;

    if (name !== undefined) sevaType.name = name;
    if (nameHi !== undefined) sevaType.nameHi = nameHi;
    if (description !== undefined) sevaType.description = description;
    if (durationMinutes !== undefined) sevaType.durationMinutes = durationMinutes;
    if (frequency !== undefined) sevaType.frequency = frequency;
    if (pricingTiers !== undefined) sevaType.pricingTiers = pricingTiers as PricingTier[];
    if (maxBookingsPerSlot !== undefined) sevaType.maxBookingsPerSlot = maxBookingsPerSlot;
    if (advanceBookingDays !== undefined) sevaType.advanceBookingDays = advanceBookingDays;
    if (requiresSankalpa !== undefined) sevaType.requiresSankalpa = requiresSankalpa;
    if (isOnlineBookable !== undefined) sevaType.isOnlineBookable = isOnlineBookable;
    if (availableDays !== undefined) sevaType.availableDays = availableDays;
    if (availableTimeSlots !== undefined) sevaType.availableTimeSlots = availableTimeSlots as TimeSlot[];
    if (sortOrder !== undefined) sevaType.sortOrder = sortOrder;
    if (isActive !== undefined) sevaType.isActive = isActive; 

    const saved = await this.sevaTypeRepo.save(sevaType);
    this.logger.log(`Seva type ${id} updated for temple ${templeId}`);
    return saved;
  }

  /**
   * Soft-deletes a seva type.
   * Throws NotFoundException if not found or templeId mismatch.
   */
  async remove(templeId: string, id: string): Promise<void> {
    await this.findById(templeId, id); // Guard: ensures it exists and belongs to this temple
    await this.sevaTypeRepo.softDelete(id);
    this.logger.log(`Seva type ${id} soft-deleted for temple ${templeId}`);
  }
}
