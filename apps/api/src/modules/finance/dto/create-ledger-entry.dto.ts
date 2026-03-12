import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LedgerType } from '@devaseva/types';

/**
 * DTO for manually recording a finance ledger entry.
 *
 * Security:
 * - isAutoPosted is NOT in this DTO and is ALWAYS set to false in the service.
 *   isAutoPosted=true is reserved for system-generated entries (donation/seva confirmations).
 * - templeId is never accepted here — always from req.user.templeId (JWT).
 *
 * Financial: amount must be a positive value; sign is conveyed by `type` (INCOME/EXPENSE).
 */
export class CreateLedgerEntryDto {
  /** INCOME for revenue; EXPENSE for outgoings. */
  @IsEnum(LedgerType)
  type: LedgerType;

  /**
   * Positive monetary amount in rupees.
   * Stored as decimal(14,2). TypeORM returns it as a string.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  /** ISO 8601 date for the ledger entry (e.g. '2025-06-15'). */
  @IsDateString()
  entryDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  /** Optional link to a finance category for reporting. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Optional fund allocation for the entry. */
  @IsOptional()
  @IsUUID()
  fundId?: string;

  /** Free-form payment method descriptor (e.g. 'NEFT', 'Cheque #12345'). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMode?: string;

  /** External reference number (invoice number, cheque number, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}
