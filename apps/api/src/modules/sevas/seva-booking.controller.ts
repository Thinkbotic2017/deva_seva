import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SevaBookingService } from './seva-booking.service';
import { CreateSevaBookingDto } from './dto/create-seva-booking.dto';
import { ListSevaBookingsQueryDto } from './dto/list-seva-bookings-query.dto';
import { CancelSevaBookingDto } from './dto/cancel-seva-booking.dto';
import { SevaBooking } from '../../database/entities/seva-booking.entity';

/**
 * SevaBookingController — thin routing layer for the /sevas/bookings routes.
 * All business logic lives in SevaBookingService.
 *
 * Route prefix: /api/v1/sevas/bookings
 * All routes require a valid JWT.
 */
@Controller('sevas/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SevaBookingController {
  constructor(private readonly sevaBookingService: SevaBookingService) {}

  /**
   * POST /sevas/bookings
   * Records a new seva booking. templeId is taken from the JWT — never from the body.
   */
  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.COUNTER_STAFF,
    UserRole.ACCOUNTANT,
    UserRole.HEAD_PRIEST,
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSevaBookingDto,
  ): Promise<SevaBooking> {
    return this.sevaBookingService.create(user.templeId, dto, user.sub);
  }

  /**
   * GET /sevas/bookings
   * Returns a paginated list of bookings for the authenticated user's temple.
   * Optional filters: date, status, sevaTypeId, priestId.
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSevaBookingsQueryDto,
  ): Promise<PaginatedResult<SevaBooking>> {
    return this.sevaBookingService.findAll(user.templeId, query);
  }

  /**
   * GET /sevas/bookings/day-sheet
   * Convenience alias for the day-sheet view — filters by a specific date.
   * Declared before /:id to avoid route shadowing.
   */
  @Get('day-sheet')
  async daySheet(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSevaBookingsQueryDto,
  ): Promise<PaginatedResult<SevaBooking>> {
    return this.sevaBookingService.findAll(user.templeId, query);
  }

  /**
   * GET /sevas/bookings/:id
   * Returns a single booking scoped to the requesting user's temple.
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SevaBooking> {
    return this.sevaBookingService.findById(user.templeId, id);
  }

  /**
   * PATCH /sevas/bookings/:id/devotee
   * Links an existing devotee record to a booking.
   * Typically called right after booking creation when a new devotee has been registered.
   */
  @Patch(':id/devotee')
  @Roles(
    UserRole.ADMIN,
    UserRole.COUNTER_STAFF,
    UserRole.ACCOUNTANT,
    UserRole.HEAD_PRIEST,
  )
  @HttpCode(HttpStatus.OK)
  async linkDevotee(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('devoteeId') devoteeId: string,
  ): Promise<SevaBooking> {
    return this.sevaBookingService.linkDevotee(user.templeId, id, devoteeId);
  }

  /**
   * PATCH /sevas/bookings/:id/cancel
   * Cancels a booking. Only PENDING_PAYMENT and CONFIRMED bookings may be cancelled.
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelSevaBookingDto,
  ): Promise<SevaBooking> {
    return this.sevaBookingService.cancel(user.templeId, id, dto, user.sub);
  }
}
