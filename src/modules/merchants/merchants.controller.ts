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
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth/auth.service';

@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private authService: AuthService,
  ) {}

  @Post()
  async create(@Body() createMerchantDto: CreateMerchantDto) {
    const merchant = await this.merchantsService.create(createMerchantDto);
    const token = await this.authService.createToken(merchant);
    return {
      merchant,
      access_token: token,
    };
  }

  @Get()
  findAll() {
    return this.merchantsService.findAll();
  }

  @Get(':address')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('address') address: string) {
    return this.merchantsService.findOne(address);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMerchantDto: UpdateMerchantDto,
  ) {
    return this.merchantsService.update(+id, updateMerchantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.merchantsService.remove(+id);
  }
}
