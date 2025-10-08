import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { MerchantsModule } from '../merchants/merchants.module';
import { JwtStrategy } from './strategies/jwt-strategy.service';
import { PassportModule } from '@nestjs/passport';
import { JWT_CONFIG } from '../../config/jwt.config';

@Module({
  imports: [
    forwardRef(() => MerchantsModule),
    PassportModule,
    JwtModule.register({
      global: true,
      ...JWT_CONFIG,
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
