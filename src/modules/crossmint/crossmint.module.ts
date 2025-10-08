import { Module } from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { CrossmintController } from './crossmint.controller';
import { HttpModule } from '@nestjs/axios';
import { Template } from 'src/database/tables/template.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';
import { OrdersModule } from '../orders/orders.module';
import { WooModule } from '../woo/woo.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Template]),
    TypeOrmModule.forFeature([Template, Merchant]),
    OrdersModule,
    WooModule,
  ],
  controllers: [CrossmintController],
  providers: [CrossmintService],
  exports: [CrossmintService],
})
export class CrossmintModule {}
 