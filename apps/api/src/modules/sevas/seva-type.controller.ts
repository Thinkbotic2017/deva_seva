import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { JwtPayload, UserRole } from '@devaseva/types';
import { SevaTypeService } from './seva-type.service';
import { CreateSevaTypeDto } from './dto/create-seva-type.dto';
import { UpdateSevaTypeDto } from './dto/update-seva-type.dto';
import { SevaType } from '../../database/entities/seva-type.entity';

/**
 * SevaTypeController — routes for the seva type catalogue.
 *
 * Route prefix: /api/v1/sevas/types
 * All routes require a valid JWT.
 */
@Controller('sevas/types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SevaTypeController {
  constructor(private readonly sevaTypeService: SevaTypeService) {}

  /**
   * GET /sevas/types
   * Returns active seva types for the counter UI.
   * Pass ?includeInactive=true (admin only) to include inactive types.
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<SevaType[]> {
    return this.sevaTypeService.findAll(
      user.templeId,
      includeInactive === 'true',
    );
  }

  /**
   * GET /sevas/types/:id
   * Returns a single seva type scoped to the requesting user's temple.
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SevaType> {
    return this.sevaTypeService.findById(user.templeId, id);
  }

  /**
   * POST /sevas/types
   * Creates a new seva type. Admin only.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSevaTypeDto,
  ): Promise<SevaType> {
    return this.sevaTypeService.create(user.templeId, dto);
  }

  /**
   * PATCH /sevas/types/:id
   * Partial update of a seva type. Admin only.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSevaTypeDto,
  ): Promise<SevaType> {
    return this.sevaTypeService.update(user.templeId, id, dto);
  }

  /**
   * DELETE /sevas/types/:id
   * Soft-deletes a seva type. Admin only.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.sevaTypeService.remove(user.templeId, id);
  }
}
