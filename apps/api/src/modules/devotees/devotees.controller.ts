import {
  Controller,
  Get,
  Post,
  Put,
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
import {
  DevoteesService,
  SafeDevotee,
  SafeDevoteeWithStats,
  DevoteeWithStats,
} from './devotees.service';
import { FindOrCreateDevoteeDto } from './dto/find-or-create-devotee.dto';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';
import { ListDevoteesQueryDto } from './dto/list-devotees-query.dto';

/**
 * DevoteesController — thin routing layer for the /devotees resource.
 * All business logic lives in DevoteesService.
 *
 * Route prefix: /api/v1/devotees
 * panNumberEncrypted is stripped by the service before reaching this layer.
 */
@Controller('devotees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevoteesController {
  constructor(private readonly devoteesService: DevoteesService) {}

  /**
   * POST /devotees
   * Finds an existing devotee by (temple, phone) or creates a new one.
   * Idempotent — safe to call multiple times with the same phone.
   * templeId is taken from the JWT — never from the request body.
   */
  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.COUNTER_STAFF,
    UserRole.ACCOUNTANT,
    UserRole.HEAD_PRIEST,
  )
  @HttpCode(HttpStatus.CREATED)
  async findOrCreate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: FindOrCreateDevoteeDto,
  ): Promise<SafeDevotee> {
    return this.devoteesService.findOrCreate(user.templeId, dto);
  }

  /**
   * GET /devotees
   * Returns a paginated list of devotees for the authenticated user's temple.
   * Supports search (name/phone), tier, and city filters.
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDevoteesQueryDto,
  ): Promise<PaginatedResult<SafeDevoteeWithStats>> {
    return this.devoteesService.findAll(user.templeId, query);
  }

  /**
   * GET /devotees/:id
   * Returns a single devotee with computed donation/seva stats and last 10 donations.
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DevoteeWithStats> {
    return this.devoteesService.findById(user.templeId, id);
  }

  /**
   * PUT /devotees/:id
   * Updates mutable devotee fields. PAN is re-encrypted if provided.
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDevoteeDto,
  ): Promise<SafeDevotee> {
    return this.devoteesService.update(user.templeId, id, dto);
  }
}
