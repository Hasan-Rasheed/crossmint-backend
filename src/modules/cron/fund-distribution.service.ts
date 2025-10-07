import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ethers } from 'ethers';
import { Merchant } from '../../database/tables/merchant.entity';
import * as contractArtifact from '../../contract/CloakEscrow.json';

@Injectable()
export class FundDistributionService {
  private readonly logger = new Logger(FundDistributionService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  // Run every 24 hours
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async distributeFunds() {
    this.logger.log('Starting fund distribution cron job...');
    
    try {
      // Get all merchants with contract addresses
      const merchants = await this.merchantRepository.find({
        where: {
          contractAddress: Not(''), // Only merchants with deployed contracts
        },
      });

      this.logger.log(`Found ${merchants.length} merchants with contracts`);

      const distributionResults: Array<{
        merchantId: number;
        businessName: string;
        contractAddress: string | undefined;
        success: boolean;
        message: string;
        transactionHash: string | undefined;
      }> = [];

      for (const merchant of merchants) {
        try {
          const result = await this.distributeFundsForMerchant(merchant);
          distributionResults.push({
            merchantId: merchant.id,
            businessName: merchant.businessName,
            contractAddress: merchant.contractAddress,
            success: result.success,
            message: result.message,
            transactionHash: result.transactionHash,
          });
        } catch (error) {
          this.logger.error(`Failed to distribute funds for merchant ${merchant.id}:`, error);
          distributionResults.push({
            merchantId: merchant.id,
            businessName: merchant.businessName,
            contractAddress: merchant.contractAddress,
            success: false,
            message: error.message,
            transactionHash: undefined,
          });
        }
      }

      this.logger.log('Fund distribution completed:', distributionResults);
      
      // Log summary
      const successful = distributionResults.filter(r => r.success).length;
      const failed = distributionResults.filter(r => !r.success).length;
      this.logger.log(`Distribution Summary: ${successful} successful, ${failed} failed`);

    } catch (error) {
      this.logger.error('Fund distribution cron job failed:', error);
    }
  }

  private async distributeFundsForMerchant(merchant: Merchant): Promise<{
    success: boolean;
    message: string;
    transactionHash?: string;
  }> {
    try {
      if (!merchant.contractAddress) {
        return {
          success: false,
          message: 'No contract address found for merchant',
        };
      }

      // Create contract instance
      const escrowContract = new ethers.Contract(
        merchant.contractAddress,
        contractArtifact.abi,
        this.wallet,
      );

      // Check if there are funds to distribute
      const balance = await this.provider.getBalance(merchant.contractAddress);
      if (balance === 0n) {
        return {
          success: true,
          message: 'No funds to distribute',
        };
      }

      this.logger.log(`Distributing funds for merchant ${merchant.id}: ${ethers.formatEther(balance)} ETH`);

      // Call the distribute function
      const distributeTx = await escrowContract.distribute();
      
      // Wait for transaction to be mined
      const receipt = await distributeTx.wait();
      
      this.logger.log(`Funds distributed for merchant ${merchant.id}. Transaction: ${receipt.hash}`);

      return {
        success: true,
        message: 'Funds distributed successfully',
        transactionHash: receipt.hash,
      };

    } catch (error) {
      this.logger.error(`Error distributing funds for merchant ${merchant.id}:`, error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Manual trigger for testing
  async triggerDistribution(): Promise<any> {
    this.logger.log('Manual fund distribution triggered');
    await this.distributeFunds();
  }

  // Distribute funds for a specific merchant
  async distributeFundsForSpecificMerchant(merchantId: number): Promise<any> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found`);
    }

    if (!merchant.contractAddress) {
      throw new Error(`Merchant ${merchantId} has no contract address`);
    }

    return await this.distributeFundsForMerchant(merchant);
  }
}
