import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EncryptionUtil } from './utils/encryption.util';
import { FiscalYearUtil } from './utils/fiscal-year.util';
import { ReceiptNumberUtil } from './utils/receipt-number.util';
import { S3Service } from './services/s3.service';
import { PdfService } from './services/pdf.service';
import { GupshupService } from './services/gupshup.service';

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
  providers: [EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil, S3Service, PdfService, GupshupService],
  exports: [JwtModule, EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil, S3Service, PdfService, GupshupService],
})
export class CommonModule {}
