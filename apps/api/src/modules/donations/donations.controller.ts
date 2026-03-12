import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload, UserRole, PaginatedResult, DonationStatus } from '@devaseva/types';
import {
  DonationsService,
  DonationWithReceiptUrl,
  InitiateOnlineResult,
} from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ListDonationsQueryDto } from './dto/list-donations-query.dto';
import { InitiateOnlineDonationDto } from './dto/initiate-online-donation.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Donation } from '../../database/entities/donation.entity';

/**
 * DonationsController — thin routing layer.
 * All business logic lives in DonationsService.
 *
 * Route prefix: /api/v1/donations
 * All routes require a valid JWT (JwtAuthGuard is global, but repeated here for clarity).
 */
@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  /**
   * POST /donations
   * Records a new donation. templeId is taken from the JWT — never from the request body.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDonationDto,
  ): Promise<Donation> {
    return this.donationsService.create(user.templeId, dto, user.sub);
  }

  /**
   * GET /donations
   * Returns a paginated list of donations for the authenticated user's temple.
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDonationsQueryDto,
  ): Promise<PaginatedResult<Donation>> {
    return this.donationsService.findAll(user.templeId, query);
  }

  /**
   * POST /donations/initiate-online
   * Public endpoint — no JWT required.
   * Creates a PENDING donation and a Razorpay order for the checkout modal.
   * The temple is identified by templeSlug in the body.
   */
  @Post('initiate-online')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async initiateOnline(
    @Body() dto: InitiateOnlineDonationDto,
  ): Promise<InitiateOnlineResult> {
    return this.donationsService.initiateOnlinePayment(dto);
  }

  /**
   * GET /donations/by-order/:orderId
   * Public endpoint — no JWT required.
   * Returns the current status of a donation so the client can poll after checkout.
   * Exposes only status + donationId (never PAN or financial details).
   */
  @Get('by-order/:orderId')
  @Public()
  async findByOrderId(
    @Param('orderId') orderId: string,
  ): Promise<{ status: DonationStatus; donationId: string } | null> {
    const donation = await this.donationsService.findByRazorpayOrderId(orderId);
    if (!donation) return null;
    return { status: donation.status, donationId: donation.id };
  }

  /**
   * GET /donations/:id
   * Returns a single donation. Includes a pre-signed receipt URL if available.
   * Declared AFTER /by-order/:orderId to avoid route shadowing.
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DonationWithReceiptUrl> {
    return this.donationsService.findById(user.templeId, id);
  }

  /**
   * POST /donations/:id/resend-receipt
   * Re-queues receipt PDF generation and WhatsApp delivery for a confirmed donation.
   */
  @Post(':id/resend-receipt')
  @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async resendReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ queued: boolean }> {
    await this.donationsService.resendReceipt(user.templeId, id);
    return { queued: true };
  }
}
