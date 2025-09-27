import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';
import { Repository } from 'typeorm';
import { response } from 'express';
import { ethers } from 'ethers';
import * as contractArtifact from '../../contract/CloakEscrowFactory.json';
import { CrossmintService } from '../crossmint/crossmint.service';

@Injectable()
export class MerchantsService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly crossmintService: CrossmintService,
  ) {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async create(merchantData: CreateMerchantDto) {
    try {
      console.log("IN create service")
       // 1. Deploy contract
      const factory = new ethers.ContractFactory(
      contractArtifact.abi,
      contractArtifact.bytecode,
      this.wallet,
    );
    console.log("before deployment")
    const contract = await factory.deploy("0xd34f5C6e691aA60577B86FE61914D0Ea650e98a2",merchantData.receivingAddress);
    await contract.waitForDeployment();
    console.log("After deployment")
    const contractAddress = await contract.getAddress();
    console.log("Contract Address", contractAddress)
    // create collection against merchant
    const merchantEntity = this.merchantRepository.create({
      ...merchantData,
      contractAddress,
    });
    const collection = await this.crossmintService.createCollection(merchantEntity);
    console.log("Collection of merchant" , collection);
    
    // Add collection ID to merchant entity
    merchantEntity.collectionId = collection.id;
    const savedMerchant = await this.merchantRepository.save(merchantEntity);
      return {
        statusCode: 201,
        success: true,
        message: 'Merchant created successfully',
        data: savedMerchant,
      };
    } catch (error) {
      console.log("error", error)
      throw new HttpException(
        {
          status: HttpStatus.BAD_GATEWAY,
          error: 'Failed to create merchant',
          message: error?.response?.data?.error || error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async findByBusinessName(businessName: string): Promise<Merchant | null> {
    return await this.merchantRepository.findOne({
      where: { businessName },
    });
  }

  findAll() {
    return `This action returns all merchants`;
  }

  async findOne(address: string): Promise<Merchant | null> {
    return await this.merchantRepository.findOne({
      where: { receivingAddress: address.toLowerCase() },
    });
  }

  async findById(id: number): Promise<Merchant | null> {
    return await this.merchantRepository.findOne({
      where: { id },
    });
  }

  update(id: number, updateMerchantDto: UpdateMerchantDto) {
    return `This action updates a #${id} merchant`;
  }

  remove(id: number) {
    return `This action removes a #${id} merchant`;
  }
}
