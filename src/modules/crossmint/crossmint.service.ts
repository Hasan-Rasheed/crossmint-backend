import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCrossmintDto } from './dto/create-crossmint.dto';
import { UpdateCrossmintDto } from './dto/update-crossmint.dto';
import axios from 'axios';
import { Merchant } from 'src/database/tables/merchant.entity';
import { ConfigService } from '@nestjs/config';
import { Template } from 'src/database/tables/template.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CrossmintService {
  private readonly API_KEY: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {
    this.API_KEY = this.configService.get<string>(
      'CROSSMINT_STAGING_API_KEY',
      '',
    );
  }

  create(createCrossmintDto: CreateCrossmintDto) {
    return 'This action adds a new crossmint';
  }

  async createCollection(merchant: Merchant) {
    console.log('api key', this.API_KEY);
    const url = 'https://staging.crossmint.com/api/2022-06-09/collections';

    const body = {
      fungibility: 'non-fungible',
      transferable: false,
      subscription: { enabled: false },
      chain: 'arbitrum-sepolia',
      metadata: {
        name: merchant.businessName,
        description: merchant.businessAddress,
        // payments:{
        //   recipientAddress: merchant.contractAddress
        // }
      },
    };

    console.log('hit api');

    try {
      const response: any = await axios.post(url, body, {
        headers: {
          'X-API-KEY': this.API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('DONE', response.data);

      return response.data;
    } catch (error) {
      console.error(
        '❌ Crossmint Create Collection API error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to create Crossmint order',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTemplate(
    collectionId: string,
    merchantId: number,
    metadata: {
      description: string;
      name: string;
      image: string;
      symbol: string;
    },
  ) {
    const url = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/templates`;

    const body = { metadata };

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-API-KEY': this.API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Template created:', response.data);
      const data = response.data;

      const merchant = await this.merchantRepository.findOne({
        where: { id: merchantId },
      });
      if (!merchant) {
        throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND);
      }

      console.log('merchant', merchant);
      const template = this.templateRepository.create({
        crossmintTemplateId: data.templateId,
        name: data.metadata.name,
        description: data.metadata.description,
        image: data.metadata.image,
        symbol: data.metadata.symbol,
        merchant: merchant,
      });

      const result = await this.templateRepository.save(template);
      console.log('completed', result);
      return result;
    } catch (error) {
      console.error(
        '❌ Crossmint API error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to create Crossmint template',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
 
  async mintNft(collectionId: string, address: string, imageUrl: string) {
    console.log('minting nft...');

    const url = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`;

    const body = {
      recipient: address,
      metadata: {
        name: 'test',
        image: imageUrl,
        description: 'this is the description',
      },
    };

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-API-KEY': this.API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Mint request complete:', response.data);

      // optionally call status checkers here if you want
      // await this.checkMintStatus(response.data.id);
      // await this.getOrderStatus(response.data);

      return response.data;
    } catch (error) {
      console.error(
        '❌ Crossmint API error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to mint NFT',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkMintStatus(mintActionId: string) {
    const url = `https://staging.crossmint.com/api/2022-06-09/actions/${mintActionId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'X-API-KEY': this.API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Mint status:', response.data);
      return response.data;
    } catch (error) {
      console.error(
        '❌ Crossmint API error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to check mint status',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOrder(
    chain: string,
    tokenAddress: string,
    amount: string,
    receiptEmail: string,
    recipientWalletAddress: string,
  ) {
    const url = 'https://staging.crossmint.com/api/2022-06-09/orders';

    const tokenLocator = `${chain}:${tokenAddress}`;
    console.log('env', this.API_KEY);
    const body = {
      lineItems: [
        {
          // tokenLocator: 'solana:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC (staging)
          tokenLocator,
          executionParameters: {
            mode: 'exact-in',
            amount,
          },
        },
      ],
      payment: {
        method: 'checkoutcom-flow',
        receiptEmail,
      },
      recipient: {
        walletAddress: recipientWalletAddress,
      },
    };

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.API_KEY || '',
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        '❌ Crossmint createOrder error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to create Crossmint order',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOrderStatus(orderId: string) {
    const url = `https://staging.crossmint.com/api/2022-06-09/orders/${orderId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY,
        },
      });

      console.log('res', response.data);
      console.log('kyc', response.data.payment?.preparation);

      return response.data;
    } catch (error) {
      console.error(
        '❌ Crossmint API error:',
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to fetch order status',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  findAll() {
    return `This action returns all crossmint`;
  }

  findOne(id: number) {
    return `This action returns a #${id} crossmint`;
  }

  update(id: number, updateCrossmintDto: UpdateCrossmintDto) {
    return `This action updates a #${id} crossmint`;
  }

  remove(id: number) {
    return `This action removes a #${id} crossmint`;
  }
}
