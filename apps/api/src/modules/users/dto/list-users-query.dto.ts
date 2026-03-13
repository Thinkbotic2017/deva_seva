import { IsOptional, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserRole } from '@devaseva/types';

export class ListUsersQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true'  || value === true)  return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
