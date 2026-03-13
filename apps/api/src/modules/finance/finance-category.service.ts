import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceCategory } from '../../database/entities/finance-category.entity';
import { FinanceCategoryType } from '@devaseva/types';
import { CreateFinanceCategoryDto } from './dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from './dto/update-finance-category.dto';

/**
 * FinanceCategoryService manages INCOME/EXPENSE categories for the finance ledger.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
 * - All queries include WHERE temple_id = templeId.
 */
@Injectable()
export class FinanceCategoryService {
  private readonly logger = new Logger(FinanceCategoryService.name);

  constructor(
    @InjectRepository(FinanceCategory)
    private readonly categoryRepo: Repository<FinanceCategory>,
  ) {}

  /**
   * Returns finance categories for a temple.
   * By default returns only active categories (includeInactive=false).
   * Pass type to filter by INCOME or EXPENSE.
   */
  async findAll(
    templeId: string,
    type?: FinanceCategoryType,
    includeInactive = false,
  ): Promise<FinanceCategory[]> {
    const where: Record<string, unknown> = { templeId };
    if (type) where['type'] = type;
    if (!includeInactive) where['isActive'] = true;

    return this.categoryRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Returns a single finance category scoped to the temple.
   * Throws NotFoundException if not found or templeId mismatch.
   */
  async findById(templeId: string, id: string): Promise<FinanceCategory> {
    const category = await this.categoryRepo.findOne({ where: { id, templeId } });
    if (!category) {
      throw new NotFoundException(`Finance category ${id} not found`);
    }
    return category;
  }

  /**
   * Creates a new finance category for the temple.
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   */
  async create(templeId: string, dto: CreateFinanceCategoryDto): Promise<FinanceCategory> {
    const category = this.categoryRepo.create({
      templeId,
      name: dto.name,
      type: dto.type,
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
      ...(dto.color !== undefined ? { color: dto.color } : {}),
    });

    const saved = await this.categoryRepo.save(category);
    this.logger.log(`Finance category ${saved.id} [${dto.type}] created for temple ${templeId}`);
    return saved;
  }

  /**
   * Updates a finance category.
   * Only provided fields are updated.
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   */
  async update(templeId: string, id: string, dto: UpdateFinanceCategoryDto): Promise<FinanceCategory> {
    const category = await this.findById(templeId, id);

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.color !== undefined) category.color = dto.color;

    const saved = await this.categoryRepo.save(category);
    this.logger.log(`Finance category ${id} updated for temple ${templeId}`);
    return saved;
  }

  /**
   * Soft-deletes a finance category by setting isActive = false.
   * System categories (isSystem=true) are skipped silently — they cannot be deactivated.
   *
   * @param templeId  From req.user.templeId (JWT). NEVER from dto.
   */
  async deactivate(templeId: string, id: string): Promise<void> {
    const category = await this.findById(templeId, id);
    if (category.isSystem) return; // system categories are immutable
    category.isActive = false;
    await this.categoryRepo.save(category);
    this.logger.log(`Finance category ${id} deactivated for temple ${templeId}`);
  }
}
