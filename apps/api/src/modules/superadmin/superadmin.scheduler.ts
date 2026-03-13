import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SuperAdminService } from './superadmin.service';

/**
 * SuperAdminScheduler runs platform-level cron jobs.
 * Registered as a provider in SuperAdminModule.
 */
@Injectable()
export class SuperAdminScheduler {
  private readonly logger = new Logger(SuperAdminScheduler.name);

  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Runs daily at 1:00 AM IST (UTC 19:30 previous day → cron is UTC).
   * Suspends all active temples whose plan_valid_until has passed.
   *
   * Cron string '30 19 * * *' = 19:30 UTC = 01:00 IST.
   * Idempotent — suspending an already-suspended temple is a no-op.
   */
  @Cron('30 19 * * *')
  async handleAutoSuspend(): Promise<void> {
    this.logger.log('Auto-suspend cron triggered');
    try {
      await this.superAdminService.autoSuspendExpiredTemples();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Auto-suspend cron failed: ${msg}`);
    }
  }
}
