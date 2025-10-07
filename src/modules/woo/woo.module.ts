import { Module } from '@nestjs/common';
import { WooService } from './woo.service';
import { WooController } from './woo.controller';

@Module({
  controllers: [WooController],
  providers: [WooService],
})
export class WooModule {}
