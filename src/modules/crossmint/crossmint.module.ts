import { Module } from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { CrossmintController } from './crossmint.controller';
import { HttpModule } from '@nestjs/axios';
import { Template } from 'src/database/tables/template.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Template]),
    TypeOrmModule.forFeature([Template, Merchant]),
  ],
  controllers: [CrossmintController],
  providers: [CrossmintService],
  exports: [CrossmintService],
})
export class CrossmintModule {}
