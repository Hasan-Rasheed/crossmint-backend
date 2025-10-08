import { Module } from '@nestjs/common';
import { OrderService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/database/tables/order.entity';
import { Merchant } from 'src/database/tables/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Merchant])],
  providers: [OrderService],
  controllers: [OrdersController],
  exports: [OrderService],
})
export class OrdersModule {}
