import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EmailService } from './email.service';
import { Admin } from '../../database/tables/admin.entity';
import { Otp } from '../../database/tables/otp.entity';
import { Merchant } from '../../database/tables/merchant.entity';
import { Order } from '../../database/tables/order.entity';
import { Distribution } from '../../database/tables/distribution.entity';
import { AuthModule } from '../auth/auth.module';
import { JWT_CONFIG } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Otp, Merchant, Order, Distribution]),
    AuthModule, // This provides JwtStrategy
    JwtModule.register(JWT_CONFIG), // Use same config as AuthModule
  ],
  controllers: [AdminController],
  providers: [AdminService, EmailService],
  exports: [AdminService, EmailService],
})
export class AdminModule {}
