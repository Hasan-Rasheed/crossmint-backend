import { WooService } from './../woo/woo.service';
import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { CreateCrossmintDto } from './dto/create-crossmint.dto';
import { UpdateCrossmintDto } from './dto/update-crossmint.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import axios from 'axios';
import { Merchant } from 'src/database/tables/merchant.entity';
import { ConfigService } from '@nestjs/config';
import { Template } from 'src/database/tables/template.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderService } from '../orders/orders.service';

@Injectable()
export class CrossmintService {
  private readonly API_KEY: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly orderService: OrderService,
    private readonly WooService: WooService,

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
    console.log("Merchant ", merchant)
    const url = 'https://staging.crossmint.com/api/2022-06-09/collections';

    const body = {
    fungibility: 'non-fungible',
    transferable: false,
    subscription: { enabled: false },
    chain: 'arbitrum-sepolia',
    metadata: {
      name: `Purchase Receipt - ${merchant.businessName}`,
      description: "NFT Minted Purchase Receipt"
    },
    payments: {  // Changed from 'checkout' to 'payments'
        price: "10.00", // You need to specify a price
        recipientAddress: merchant.contractAddress?.toString(), // Changed from 'recipient.walletAddress'
        currency: "usdc" // Moved currency here
    },
    checkout: {
      enabled: true,
      pricing: {
        type: "dynamic" 
      },
      paymentMethods: {
        crypto: {
          enabled: true,
        },
        fiat: {
          enabled: true,
        }
      },
    }
  };

//   const body = {
//     fungibility: 'non-fungible',
//     transferable: false,
//     subscription: { enabled: false },
//     chain: 'arbitrum-sepolia',
//     metadata: {
//         name: merchant.businessName,
//         description: merchant.businessAddress
//     },
//     checkout: {
//         enabled: true,
//         pricing: {
//             type: "dynamic" 
//         },
//         paymentMethods: {
//             crypto: {
//                 enabled: true,
//             },
//             fiat: {
//                 enabled: true,
//             }
//         },
//         recipientAddress: merchant.contractAddress,
//         currency: "usdc"
//     }
// };

    console.log('hit api =>', body);

    try {
      const response: any = await axios.post(url, body, {
        headers: {
          'X-API-KEY': this.API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('Create Collection DONE', response.data);
  
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

  async initiatePayment(purchaseData: InitiatePaymentDto) {
    // console.log("Data ==>" , purchaseData)
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;
    
    // Fetch merchant by ID to get collection ID
    const merchant = await this.merchantRepository.findOne({
      // where: { id: parseInt(purchaseData.merchantId) }
      where: { storeUrl: purchaseData.storeUrl }

    });
    console.log("Merchat ", merchant)
    if (!merchant || !merchant.collectionId) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Merchant not found or collection not created',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const url = 'https://staging.crossmint.com/api/2022-06-09/orders';

    // Build order based on payment method
    const nftPrice = 1
    const mintAmount = 20
    const order = {
      recipient: {
        email: purchaseData.email
      },
      payment: purchaseData.method === 'card' 
        ? {
            method: "stripe-payment-element",
            currency: purchaseData.currency
          }
        : {
            method: "arbitrum-sepolia",
            currency: purchaseData.currency,
            payerAddress: purchaseData.payerAddress
          },
      lineItems: [{
        collectionLocator: `crossmint:${merchant.collectionId}`,
        callData: {
          totalPrice: purchaseData.totalPrice,
          recipientAddress: purchaseData.payerAddress,
        }
      }]
    };

    // console.log('Initiating purchase order:', order.lineItems[0].callData);
    // console.log("Call data ==>", order.lineItems[0].callData)

    try {
         const response = await fetch(`${url}`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "x-api-key": API_KEY || ''
         },
         body: JSON.stringify(order),
       });
       const res = await response.json()
       console.log("RESPONSE ", response)
       if (!response.ok) {
        console.log("Here")
        console.log("error response ", res) 
        //  const error = await response.json();
         throw new Error(res.error);
        }
        // console.log('res from crossmint', res);
        // add an entry to the db
    // store
    // orders ka table
    // merchant id, woo commerce order id, crossmint order id, status = 'awaiting-payment' and store url

        const { merchantId, storeUrl, orderId } = purchaseData;

      console.log('params', merchantId, res.order.orderId, orderId, storeUrl);

     const createOrder = await this.orderService.create({
      merchantId: Number(merchantId),
      crossmintId: res.order.orderId,
      wooId: orderId,
      storeUrl: storeUrl,
      status: 'awaiting-payment',
    });

    // console.log('create order', createOrder);

 
    // webhook mai
    // crossmint order id se woo commerce id aur status 'processing' and redirect and mark our status paid/completed


    // const orderPaidResult = await this.WooService.markOrderPaid(Number(createOrder.wooId))
    // console.log('order paid result', orderPaidResult);
        // console.log('✅ Purchase order created:', res);
      return res;
    } catch (error) {
      console.error(
        '❌ Crossmint Purchase API error:',error ||
        error.response?.data || error.message,
      );

      throw new HttpException(
        {
          status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data || 'Failed to initiate purchase',
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTemplate(collectionId: string, merchantId: number, metadata: {
    description: string;
    name: string;
    image: string;
    symbol: string;
  }) {
    console.log('collection id', collectionId);
    const API_KEY = process.env.CROSSMINT_STAGING_API_KEY;
    console.log('api key', API_KEY);
    // const imageUrl =
    //   'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSbsivgTsjEmdUEIW_UrzOA8EJY1IJbIWaJd-ONdBMAIYqvYYUUjy_JSwFqgocI5zBpLEFJXEdogUtG5MeBCXQE8bPnmSAqVidZ-zEn7HVi';

    console.log('create template');

    const url = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/templates`;

    const body = { metadata };
    console.log("Body in Create Tempalte ", body)

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
      const templateBody = {
        crossmintTemplateId: data.templateId,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        symbol: metadata.symbol,
        merchant: merchant,
      }
      console.log("Template Body ", templateBody)

      const template = this.templateRepository.create(templateBody);

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
