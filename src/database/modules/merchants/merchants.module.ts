import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';

@Module({
   imports: [TypeOrmModule.forFeature([Merchant])], 
  controllers: [MerchantsController],
  providers: [MerchantsService],
    exports: [TypeOrmModule],
})
export class MerchantsModule {}
