import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@devaseva/types';

/**
 * AuthController — thin routing layer. All logic lives in AuthService.
 * Public routes are marked @Public() to bypass JwtAuthGuard.
 *
 * Route: /api/v1/auth/...
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/request-otp
   * Generates an OTP for the given phone. Public endpoint.
   * Returns sessionId which must be sent back on /verify-otp.
   * NOTE: In production the OTP is delivered via WhatsApp/SMS queue.
   *       In development/staging the OTP is omitted from the response.
   */
  @Post('request-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Req() req: Request,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    const ipAddress = req.ip;
    const result = await this.authService.requestOtp(dto, ipAddress);

    // Never return the OTP in the response — it is delivered out-of-band.
    return { sessionId: result.sessionId, expiresAt: result.expiresAt };
  }

  /**
   * POST /auth/verify-otp
   * Verifies the OTP and returns a JWT access + refresh token pair.
   */
  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { userId: string; templeId: string; role: string; fullName: string };
  }> {
    const ipAddress = req.ip;
    return this.authService.verifyOtp(dto, ipAddress);
  }

  /**
   * POST /auth/refresh
   * Issues a new access token.
   * userId is decoded from the refresh token — NOT from the request body.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    return this.authService.refresh(dto);
  }

  /**
   * GET /auth/me
   * Returns the authenticated user's profile and temple details.
   */
  @Get('me')
  async me(@CurrentUser() user: JwtPayload): Promise<unknown> {
    return this.authService.me(user.sub);
  }

  /**
   * POST /auth/logout
   * Revokes a single session. sessionId must match the calling user.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.authService.logout(dto.sessionId, user.sub);
    return { success: true };
  }

  /**
   * POST /auth/logout-all
   * Revokes all sessions for the authenticated user.
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.authService.logoutAll(user.sub);
    return { success: true };
  }
}
