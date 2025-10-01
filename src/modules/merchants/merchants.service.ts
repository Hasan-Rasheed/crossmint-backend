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
// import FormData from 'form-data';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class MerchantsService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private pinataApiKey = process.env.PINATA_API_KEY;
  private pinataSecretApiKey = process.env.PINATA_API_SECRET;

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

  async create(merchantData: CreateMerchantDto, file?: Express.Multer.File) {
    try {
      console.log('IN create service file [][][]', file);

      let imageIpfsHash = null;
      if (file) {
        console.log('in the if')
        const formData = new FormData();
        formData.append('file', file.buffer, { filename: file.originalname });

        const pinataRes = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              ...formData.getHeaders(), // IMPORTANT: get proper headers from FormData
              pinata_api_key: this.pinataApiKey,
              pinata_secret_api_key: this.pinataSecretApiKey,
            },
          },
        );

        imageIpfsHash = pinataRes.data.IpfsHash; // Save IPFS hash
        console.log('Uploaded to IPFS:', imageIpfsHash);
        console.log('pinata res', pinataRes.data);
      }

      // 1. Deploy contract
      const factory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        this.wallet,
      );
      console.log('before deployment');
      const contract = await factory.deploy(
        process.env.PLATFORM_FEES_RECEIVING_ADDRESS,
        merchantData.receivingAddress,
      );
      await contract.waitForDeployment();
      console.log('After deployment');
      const contractAddress = await contract.getAddress();
      console.log('Contract Address', contractAddress);
      // create collection against merchant
      const merchantEntity = this.merchantRepository.create({
        ...merchantData,
        contractAddress,
      });
      const collection =
        await this.crossmintService.createCollection(merchantEntity);
      console.log('Collection of merchant', collection);
      const imageURL = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`
      console.log("image url", imageURL)

      const template = await this.crossmintService.createTemplate(collection.id, merchantEntity.id, {
        name: merchantData.businessName,
        description: merchantData.businessAddress,
        image: imageURL,
        symbol: merchantData.businessName,
      });
      console.log('Template of merchant', template);
      // Add collection ID to merchant entity
      merchantEntity.collectionId = collection.id;

      if (imageIpfsHash) {
        merchantEntity.imageIpfsHash = imageIpfsHash;
      }
      const savedMerchant = await this.merchantRepository.save(merchantEntity);
      return {
        statusCode: 201,
        success: true,
        message: 'Merchant created successfully',
        data: savedMerchant,
      };
    } catch (error) {
      console.log('error', error);
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

  async updateMerchant(
    businessName: string,
    updateMerchantDto: UpdateMerchantDto,
    file?: Express.Multer.File,
  ) {
    try {
      console.log('old business name', businessName);
      console.log('new business name', updateMerchantDto);
      const merchant = await this.merchantRepository.findOne({
        where: { businessName },
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }
      console.log('1111111111111111', file);

      let imageIpfsHash = null;
      if (file) {
        console.log('22222222222222222222222222');
        const formData = new FormData();
        formData.append('file', file.buffer, { filename: file.originalname });

        console.log('3333333333333333333333');
        const pinataRes = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              ...formData.getHeaders(),
              pinata_api_key: this.pinataApiKey,
              pinata_secret_api_key: this.pinataSecretApiKey,
            },
          },
        );

        imageIpfsHash = pinataRes.data.IpfsHash;
        console.log('Uploaded to IPFS:', imageIpfsHash);
        console.log('pinata res', pinataRes.data);
      }
      if (imageIpfsHash) {
        merchant.imageIpfsHash = imageIpfsHash;
      }

      console.log('assign kro');

      Object.assign(merchant, updateMerchantDto);

      return await this.merchantRepository.save(merchant);
    } catch (err) {
      console.log('error', err);
    }
  }

  async findByBusinessName(businessName: string): Promise<Merchant | null> {
    return await this.merchantRepository.findOne({
      where: { businessName },
    });
  }

  async findAll(): Promise<Merchant[]> {
    return await this.merchantRepository.find();
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
