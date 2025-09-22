import { Injectable } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}
  
  async create(merchantData: CreateMerchantDto): Promise<CreateMerchantDto> {
  const merchant = this.merchantRepository.create(merchantData);
  return await this.merchantRepository.save(merchant);
}

  findAll() {
    return `This action returns all merchants`;
  }

  findOne(id: number) {
    return `This action returns a #${id} merchant`;
  }

  update(id: number, updateMerchantDto: UpdateMerchantDto) {
    return `This action updates a #${id} merchant`;
  }

  remove(id: number) {
    return `This action removes a #${id} merchant`;
  }
}
