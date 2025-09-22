import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { MerchantsModule } from '../merchants/merchants.module';
import { JwtStrategy } from './strategies/jwt-strategy.service';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    forwardRef(() => MerchantsModule),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: 'your_jwt_secret',
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
