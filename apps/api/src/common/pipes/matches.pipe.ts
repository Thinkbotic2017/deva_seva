import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a string path/query param matches a given RegExp.
 * Throws BadRequestException (400) if the value does not match.
 *
 * Usage:
 *   @Param('orderId', new MatchesPipe(/^order_[A-Za-z0-9]{14,}$/)) orderId: string
 */
@Injectable()
export class MatchesPipe implements PipeTransform {
  constructor(private readonly pattern: RegExp) {}

  transform(value: string): string {
    if (!this.pattern.test(value)) {
      throw new BadRequestException('Invalid format');
    }
    return value;
  }
}
