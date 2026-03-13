import { IsString, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  /** The opaque refresh token issued at login or last refresh. */
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
