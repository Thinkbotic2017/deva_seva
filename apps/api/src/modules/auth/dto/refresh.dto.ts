import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  /** The opaque refresh token issued at login. userId decoded from this token — never sent in body. */
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
