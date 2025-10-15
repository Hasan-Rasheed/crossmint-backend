// import { AuthService } from './../../auth/auth.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  NotFoundException,
  Put,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth/auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Merchant } from 'src/database/tables/merchant.entity';
import { CurrentUser } from '../auth/decorators/merchant.decorator';

@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private authService: AuthService,
  ) {}

  @Post('validate-license')
  @ApiOperation({ summary: 'Validate merchant API key' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', example: 'your-api-key' },
      },
    },
  })
  async validateApiKey(@Body() body) {
    console.log('body', body);
    return {
      valid: true,
      license_type: 'premium',
      expires_at: '2026-12-31',
      customer_email: 'customer@email.com',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Onboard a new merchant' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessName: { type: 'string', example: 'CryptoStore' },
        receivingAddress: { type: 'string', example: '0xAbCdEf123456...' },
        contactInformation: {
          type: 'string',
          example: 'Contact information of the merchant',
        },
        businessAddress: {
          type: 'string',
          example: 'Business address of the merchant',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    // @UploadedFile() file: Express.Multer.File,
    @Body() createMerchantDto: CreateMerchantDto,
  ) {
    console.log('==============================');
    console.log('calling create api');
    // console.log('Body:', body);
    // console.log('File:', file);

    const merchant = await this.merchantsService.create(
      createMerchantDto,
      // file,
    );
    const token = await this.authService.createToken(merchant);
    return {
      merchant,
      access_token: token,
    };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getMerchant(@CurrentUser() user: Merchant) {
    // console.clear();
    // console.log('got request', merchantId);
    console.log('user [][][][][][]', user);
    const merchantId = user.id;
    const merchant = await this.merchantsService.findMerchant(
      String(merchantId),
    );
    if (!merchant) {
      throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND);
    }
    return merchant;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('add-store-url')
  async addStoreUrl(
    @CurrentUser() user: any,
    @Body('storeUrl') storeUrl: string,
    @Body('receivingAddress') receivingAddress: string,
  ) {
    return this.merchantsService.addStoreUrl(
      user.id,
      storeUrl,
      receivingAddress,
    );
  }

  @Put('update-store')
  @UseGuards(AuthGuard('jwt'))
  async updateStore(@Req() req, @Body() body: any) {
    console.log('in update store')
    const userId = req.user.id;
    const { storeUrl, newReceivingAddress } = body;

    return this.merchantsService.updateStore(
      userId,
      storeUrl,
      newReceivingAddress,
    );
  }

  @Put()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async updateMerchant(
    @Body() updateMerchantDto: UpdateMerchantDto,
    @Query('businessName') businessName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updatedMerchant = await this.merchantsService.updateMerchant(
      businessName,
      updateMerchantDto,
      file,
    );
    return updatedMerchant;
  }

  @Get()
  async findByBusinessName(
    @Query('businessName') businessName: string,
  ): Promise<Merchant> {
    const merchant =
      await this.merchantsService.findByBusinessName(businessName);

    if (!merchant) {
      throw new NotFoundException(
        `Merchant with business name "${businessName}" not found`,
      );
    }

    return merchant;
  }

  @Get('getAll')
  findAll() {
    return this.merchantsService.findAll();
  }

  // @Get(':address')
  // @UseGuards(AuthGuard('jwt'))
  // findOne(@Param('address') address: string) {
  //   return this.merchantsService.findOne(address);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateMerchantDto: UpdateMerchantDto,
  // ) {
  //   return this.merchantsService.update(+id, updateMerchantDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.merchantsService.remove(+id);
  // }
}
