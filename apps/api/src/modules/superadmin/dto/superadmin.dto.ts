import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsIn,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEmail,
  IsArray,
  ArrayMaxSize,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BillingCycle } from '@devaseva/types';

/**
 * Inline enum object for @IsEnum() — avoids the stale enums.js compiled output
 * in packages/types/src/ returning undefined for BillingCycle at runtime.
 * Keep in sync with packages/types/src/enums.ts BillingCycle enum.
 */
const BILLING_CYCLE_VALUES = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  HALF_YEARLY: 'HALF_YEARLY',
  YEARLY: 'YEARLY',
} as const;

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(Object.values(BILLING_CYCLE_VALUES))
  billingCycle: BillingCycle;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(Object.values(BILLING_CYCLE_VALUES))
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  @Type(() => Number)
  sortOrder?: number;
}

export class ChargePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  planId: string;

  @IsIn(Object.values(BILLING_CYCLE_VALUES))
  billingCycle: BillingCycle;
}

export class ExtendPlanDto {
  @IsInt()
  @Min(1)
  @Max(36)
  @Type(() => Number)
  months: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class InviteTempleAdminDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
