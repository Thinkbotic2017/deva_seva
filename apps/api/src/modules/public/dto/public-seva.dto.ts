import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  IsDateString,
  MaxLength,
  Matches,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Nested DTO for additional sankalpa persons on a public seva booking.
 */
export class PublicSankalpaPerson {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gotra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nakshatra?: string;
}

/**
 * Body for POST /public/:slug/seva/initiate
 * No auth required — templeId is derived from the slug path param.
 */
export class PublicSevaDto {
  @IsUUID()
  sevaTypeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  devoteeName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  devoteePhone?: string;

  @IsDateString()
  sevaDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  timeSlot: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tierName?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sankalpaName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gotra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nakshatra?: string;

  @IsOptional()
  @IsString()
  sankalpaPurpose?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicSankalpaPerson)
  additionalNames?: PublicSankalpaPerson[];
}
