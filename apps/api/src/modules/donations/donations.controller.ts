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
import { JwtPayload, UserRole, PaginatedResult } from '@devaseva/types';
import { DonationsService, DonationWithReceiptUrl } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ListDonationsQueryDto } from './dto/list-donations-query.dto';
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
   * GET /donations/:id
   * Returns a single donation. Includes a pre-signed receipt URL if available.
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DonationWithReceiptUrl> {
    return this.donationsService.findById(user.templeId, id);
  }
}
