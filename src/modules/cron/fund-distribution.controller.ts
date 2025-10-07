import { Controller, Post, Param, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FundDistributionService } from './fund-distribution.service';

@Controller('fund-distribution')
export class FundDistributionController {
  constructor(
    private readonly fundDistributionService: FundDistributionService,
  ) {}

  @Post('trigger')
  async triggerDistribution() {
    try {
      await this.fundDistributionService.triggerDistribution();
      return {
        statusCode: 200,
        success: true,
        message: 'Fund distribution triggered successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to trigger fund distribution',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('merchant/:merchantId')
  async distributeForMerchant(@Param('merchantId') merchantId: string) {
    try {
      const result = await this.fundDistributionService.distributeFundsForSpecificMerchant(
        parseInt(merchantId),
      );
      return {
        statusCode: 200,
        success: true,
        message: 'Fund distribution completed',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to distribute funds for merchant',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async getStatus() {
    return {
      statusCode: 200,
      success: true,
      message: 'Fund distribution service is running',
      cronSchedule: 'Every hour',
    };
  }
}
