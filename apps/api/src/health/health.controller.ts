import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

/**
 * HealthController exposes a public /health endpoint for load balancers and
 * deployment readiness checks.
 */
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
