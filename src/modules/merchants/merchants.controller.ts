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

@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private authService: AuthService,
  ) {}

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
    @UploadedFile() file: Express.Multer.File,
    @Body() createMerchantDto: CreateMerchantDto,
  ) {
    console.log('==============================')
    console.log('calling create api')
    // console.log('Body:', body);
    console.log('File:', file);

    const merchant = await this.merchantsService.create(
      createMerchantDto,
      file,
    );
    const token = await this.authService.createToken(merchant);
    return {
      merchant,
      access_token: token,
    };
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

  // @Get()
  // findAll() {
  //   return this.merchantsService.findAll();
  // }

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
