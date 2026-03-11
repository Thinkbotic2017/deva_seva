import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * DatabaseModule configures TypeORM with PostgreSQL.
 * Uses DATABASE_URL from environment. All entities auto-load from src/database/entities/.
 * Migrations run from src/database/migrations/.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        synchronize: false, // NEVER use synchronize:true — always use migrations
        logging: config.get<string>('NODE_ENV') === 'development',
        extra: {
          max: 20, // connection pool size
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
