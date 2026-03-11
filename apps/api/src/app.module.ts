import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  otpConfig,
  financeConfig,
} from './config';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Config — must be first so all other modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, otpConfig, financeConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Task scheduler (cron jobs)
    ScheduleModule.forRoot(),

    // Redis — global, used by queues and ReceiptNumberUtil
    // Uses ConfigService (not process.env directly) so missing REDIS_URL
    // throws a startup error rather than silently falling back to localhost.
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.getOrThrow<string>('REDIS_URL'),
      }),
    }),

    DatabaseModule,
    CommonModule,

    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    Reflector,
    // Global response envelope
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Global mutation audit log
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Global error formatter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global JWT guard — all routes protected unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, TenantMiddleware)
      .forRoutes('*');
  }
}
