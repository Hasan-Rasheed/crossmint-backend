import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundDistributionService } from './fund-distribution.service';
import { FundDistributionController } from './fund-distribution.controller';
import { Merchant } from '../../database/tables/merchant.entity';
import { Distribution } from '../../database/tables/distribution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, Distribution])],
  controllers: [FundDistributionController],
  providers: [FundDistributionService],
  exports: [FundDistributionService],
})
export class CronModule {}
