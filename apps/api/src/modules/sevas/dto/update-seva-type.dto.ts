import {
  IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SevaFrequency } from '@devaseva/types';

export class UpdateSevaTypeDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(200) nameHi?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) durationMinutes?: number;
  @IsOptional() @IsEnum(SevaFrequency) frequency?: SevaFrequency;
  @IsOptional() @IsArray() pricingTiers?: Array<{ name: string; price: number; description?: string }>;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxBookingsPerSlot?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) advanceBookingDays?: number;
  @IsOptional() @IsBoolean() requiresSankalpa?: boolean;
  @IsOptional() @IsBoolean() isOnlineBookable?: boolean;
  @IsOptional() @IsArray() availableDays?: number[];
  @IsOptional() @IsArray() availableTimeSlots?: Array<{ time: string; label?: string; maxBookings?: number }>;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}