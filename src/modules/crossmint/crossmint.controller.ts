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
  // create order
  @Post('order')
  @ApiOperation({ summary: 'Create a new CrossMint collection' })
  create() {
    return this.crossmintService.createCollection();
  }

  // step 2
  // create template
  @Post('template')
  @ApiOperation({ summary: 'Onboard a new merchant' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        collectionId: {
          type: 'string',
          example: 'ac79ea30-390f-47be-93a9-bf3be0ded96a',
        },
      },
      required: ['collectionId'],
    },
  })
  createTemplate(@Body() body: { collectionId: string }) {
    const { collectionId } = body;
    return this.crossmintService.createTemplate(collectionId);
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
