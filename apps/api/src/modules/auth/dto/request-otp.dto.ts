import { IsString, Matches, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'phone must be a valid 10-digit Indian mobile number starting with 6–9',
  })
  phone: string;

  /** Optional — used by admin app when a temple context is needed at login. */
  @IsOptional()
  @IsString()
  templeSlug?: string;
}
