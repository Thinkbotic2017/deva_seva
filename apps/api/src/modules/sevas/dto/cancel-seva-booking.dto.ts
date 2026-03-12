import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for cancelling a seva booking.
 * A reason is mandatory to maintain an audit trail.
 */
export class CancelSevaBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
