import { forwardRef, Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';
import { AuthModule } from '../auth/auth.module';
import { CrossmintModule } from '../crossmint/crossmint.module';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant]), forwardRef(() => AuthModule), CrossmintModule],
  controllers: [MerchantsController],
  providers: [MerchantsService,],
  exports: [TypeOrmModule, MerchantsService],
})
export class MerchantsModule {}
