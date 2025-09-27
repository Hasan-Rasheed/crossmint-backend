import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCrossmintDto } from './dto/create-crossmint.dto';
import { UpdateCrossmintDto } from './dto/update-crossmint.dto';
import axios from 'axios';
import { Merchant } from 'src/database/tables/merchant.entity';

@Injectable()
export class CrossmintService {
  constructor() {}

  create(createCrossmintDto: CreateCrossmintDto) {
    return 'This action adds a new crossmint';
  }

  async createCollection(merchant: Merchant) {
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;
    console.log('api key', API_KEY);
    const url = 'https://staging.crossmint.com/api/2022-06-09/collections';

    const body = {
      fungibility: 'non-fungible',
      transferable: false,
      subscription: { enabled: false },
      chain: 'arbitrum-sepolia',
      metadata: {
        name: merchant.businessName,
        description: merchant.businessAddress
        // payments:{
        //   recipientAddress: merchant.contractAddress
        // }
      },
    };

    console.log('hit api');

    try {
      const response: any = await axios.post(
        url,
        body,
        {
          headers: {
            'X-API-KEY': API_KEY || '',
            'Content-Type': 'application/json',
          },
        },
      );

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

  async createTemplate(collectionId: string) {
    console.log('collection id', collectionId);
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;
    console.log('api key', API_KEY);
    const imageUrl =
      'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSbsivgTsjEmdUEIW_UrzOA8EJY1IJbIWaJd-ONdBMAIYqvYYUUjy_JSwFqgocI5zBpLEFJXEdogUtG5MeBCXQE8bPnmSAqVidZ-zEn7HVi';

    console.log('create template');

    const url = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/templates`;

    const body = {
      metadata: {
        description: 'testing',
        name: 'hello',
        image: imageUrl,
        symbol: 'ARB',
      },
    };

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-API-KEY': API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Template created:', response.data);
      return response.data;
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
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;

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
          'X-API-KEY': API_KEY || '',
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
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;
    const url = `https://staging.crossmint.com/api/2022-06-09/actions/${mintActionId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'X-API-KEY': API_KEY || '',
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
