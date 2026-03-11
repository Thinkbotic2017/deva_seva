import { IsString, IsNotEmpty, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceInfo?: string;
}
