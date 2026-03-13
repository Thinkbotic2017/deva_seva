import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  Min,
  MaxLength,
  ValidateNested,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SevaFrequency } from '@devaseva/types';

class PricingTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

class TimeSlotDto {
  @IsString()
  @IsNotEmpty()
  time: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxBookings?: number;
}

export class CreateSevaTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameHi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationMinutes?: number;

  @IsEnum(SevaFrequency)
  frequency: SevaFrequency;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingTiers?: PricingTierDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxBookingsPerSlot?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  advanceBookingDays?: number;

  @IsOptional()
  @IsBoolean()
  requiresSankalpa?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnlineBookable?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  availableDays?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  availableTimeSlots?: TimeSlotDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
