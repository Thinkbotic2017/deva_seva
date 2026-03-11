import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EncryptionUtil } from './utils/encryption.util';
import { FiscalYearUtil } from './utils/fiscal-year.util';
import { ReceiptNumberUtil } from './utils/receipt-number.util';

/**
 * CommonModule exposes shared utilities to every module in the app.
 * Marked @Global() so it does not need to be imported in every feature module.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config
          .getOrThrow<string>('JWT_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
        publicKey: config
          .getOrThrow<string>('JWT_PUBLIC_KEY')
          .replace(/\\n/g, '\n'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get<number>('JWT_ACCESS_EXPIRY', 900),
        },
      }),
    }),
  ],
  providers: [EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil],
  exports: [JwtModule, EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil],
})
export class CommonModule {}
