import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { TempleCategory } from '@devaseva/types';

export class CreateTempleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /**
   * URL-safe slug used in public donation links (e.g. /t/shri-ram-mandir).
   * Lowercase letters, digits, and hyphens only.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, digits, and hyphens only' })
  slug: string;

  @IsOptional()
  @IsEnum(TempleCategory)
  category?: TempleCategory;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN code must be 6 digits' })
  pinCode?: string;
}
