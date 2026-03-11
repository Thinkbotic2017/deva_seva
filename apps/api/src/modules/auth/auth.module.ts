import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OtpSession } from '../../database/entities/otp-session.entity';
import { Session } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';
import { Temple } from '../../database/entities/temple.entity';

/**
 * AuthModule wires together all auth services, strategy, and controller.
 * JwtModule and EncryptionUtil/FiscalYearUtil come from the global CommonModule.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([OtpSession, Session, User, Temple]),
  ],
  providers: [OtpService, SessionService, AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
