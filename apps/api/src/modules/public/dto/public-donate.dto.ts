import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body for POST /public/:slug/donate/initiate
 * No auth required — templeId is derived from the slug path param.
 */
export class PublicDonateDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  donorName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  donorPhone?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, {
    message: 'Invalid PAN format (expected ABCDE1234F)',
  })
  pan?: string;
}
