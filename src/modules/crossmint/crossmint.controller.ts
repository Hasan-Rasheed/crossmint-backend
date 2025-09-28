import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { ApiTags, ApiBody, ApiParam, ApiOperation } from '@nestjs/swagger';

@Controller('crossmint')
export class CrossmintController {
  constructor(private readonly crossmintService: CrossmintService) {}

  // step 1
  // create collection
  // @Post('collection')
  // @ApiOperation({ summary: 'Create a new CrossMint collection' })
  // create() {
  //   return this.crossmintService.createCollection();
  // }

  // step 2
  // create template
  @Post('template')
  @ApiOperation({ summary: 'Create a new NFT template in a collection' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        collectionId: {
          type: 'string',
          example: 'ac79ea30-390f-47be-93a9-bf3be0ded96a',
        },
        merchantId: {
          type: 'string',
          example: '0a22d53b-2c54-4d98-b4df-1d5a2b7f5678',
        },
        metadata: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'My NFT' },
            description: { type: 'string', example: 'Exclusive NFT drop' },
            image: {
              type: 'string',
              example:
                'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSbsivgTsjEmdUEIW_UrzOA8EJY1IJbIWaJd-ONdBMAIYqvYYUUjy_JSwFqgocI5zBpLEFJXEdogUtG5MeBCXQE8bPnmSAqVidZ-zEn7HVi',
            },
            symbol: { type: 'string', example: 'MYNFT' },
          },
          required: ['name', 'description', 'image', 'symbol'],
        },
      },
      required: ['collectionId', 'merchantId', 'metadata'],
    },
  })
  createTemplate(
    @Body()
    body: {
      collectionId: string;
      merchantId: number;
      metadata: {
        description: string;
        name: string;
        image: string;
        symbol: string;
      };
    },
  ) {
    const { collectionId, merchantId, metadata } = body;
    return this.crossmintService.createTemplate(
      collectionId,
      merchantId,
      metadata,
    );
  }

  // step 3
  // mint nft
  @Post('mint-nft')
  @ApiOperation({ summary: 'Mint an NFT to a specified address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        collectionId: {
          type: 'string',
          example: 'ac79ea30-390f-47be-93a9-bf3be0ded96a',
        },
        address: { type: 'string', example: '9x3k...solanaWalletAddress' },
        imageUrl: { type: 'string', example: 'https://example.com/nft.png' },
      },
      required: ['collectionId', 'address', 'imageUrl'],
    },
  })
  mintNft(
    @Body() body: { collectionId: string; address: string; imageUrl: string },
  ) {
    const { collectionId, address, imageUrl } = body;
    return this.crossmintService.mintNft(collectionId, address, imageUrl);
  }

  @Get('check-mint-status/:mintActionId')
  @ApiOperation({ summary: 'Check the status of a minting action' })
  @ApiParam({
    name: 'mintActionId',
    type: String,
    description: 'The action ID returned when minting an NFT',
    example: 'fbc807f3-d03b-4e8e-bd82-8830dd902765',
  })
  checkMintStatus(@Param('mintActionId') mintActionId: string) {
    return this.crossmintService.checkMintStatus(mintActionId);
  }

  @Post('order')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          example: 'solana',
          description: 'Blockchain chain (e.g., solana, ethereum, polygon)',
        },
        tokenAddress: {
          type: 'string',
          example: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          description: 'Token contract address on the specified chain',
        },
        amount: { type: 'string', example: '2' },
        receiptEmail: { type: 'string', example: 'samad13354@gmail.com' },
        recipientWalletAddress: {
          type: 'string',
          example: 'EWQrNVGW86Cd5wjWSgH9ujgUEs5gyBN55tq34nNCrBUW',
        },
      },
      required: [
        'chain',
        'tokenAddress',
        'amount',
        'receiptEmail',
        'recipientWalletAddress',
      ],
    },
  })
  createOrder(
    @Body()
    body: {
      chain: string;
      tokenAddress: string;
      amount: string;
      receiptEmail: string;
      recipientWalletAddress: string;
    },
  ) {
    const {
      chain,
      tokenAddress,
      amount,
      receiptEmail,
      recipientWalletAddress,
    } = body;

    return this.crossmintService.createOrder(
      chain,
      tokenAddress,
      amount,
      receiptEmail,
      recipientWalletAddress,
    );
  }

  @Get('order-status/:orderId')
  getOrderStatus(@Param('orderId') orderId: string) {
    return this.crossmintService.getOrderStatus(orderId);
  }

  // @Get()
  // findAll() {
  //   return this.crossmintService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.crossmintService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateCrossmintDto: UpdateCrossmintDto,
  // ) {
  //   return this.crossmintService.update(+id, updateCrossmintDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.crossmintService.remove(+id);
  // }
}
