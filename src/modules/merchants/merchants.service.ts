import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from 'src/database/tables/merchant.entity';
import { Repository } from 'typeorm';
import { response } from 'express';
import { ethers, Interface } from 'ethers';
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
  private readonly factoryContractAddress = process.env.FACTORY_CONTRACT_ADDRESS;

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

      // 1. Use factory contract to deploy escrow
      const factoryContract = new ethers.Contract(
        this.factoryContractAddress,
        contractArtifact.abi,
        this.wallet,
      );
      console.log('before deployment');
      
      // Generate merchantId (bytes32) - you might want to use merchant name or a hash
      const merchantId = ethers.id(merchantData.businessName + merchantData.receivingAddress);
      console.log("Merchant ID", merchantId)
      // First, simulate the call to get the escrow address that will be deployed
      // const escrowAddress = await factoryContract.deployEscrow.staticCall(
      //   merchantId, // merchantId (bytes32)
      //   merchantData.receivingAddress.toString(), // merchantAddress
      //   process.env.PAYMENT_TOKEN_ADDRESS, // paymentTokenAddress
      // );
      // console.log('Escrow Address (simulated):', escrowAddress);
      
      // Now execute the actual deployment
      const deploytx = await factoryContract.deployEscrow(
        merchantId, // merchantId (bytes32)
        merchantData.receivingAddress.toString(), // merchantAddress
        process.env.PAYMENT_TOKEN_ADDRESS, // paymentTokenAddress
      );
      console.log('After deployment');
      
      // Wait for transaction to be mined
      const escrowAddress = await this.getDeployedEscrowAddress(factoryContract, deploytx);
      console.log('Transaction confirmed',escrowAddress);
      // create collection against merchant
      const merchantEntity = await this.merchantRepository.create({
        ...merchantData,
        contractAddress: escrowAddress.toString(),
      });
      const collection =
      await this.crossmintService.createCollection(merchantEntity);
      console.log('Collection of merchant', collection);
      merchantEntity.collectionId = collection.id;
      if (imageIpfsHash) {
        merchantEntity.imageIpfsHash = imageIpfsHash;
      }
      const savedMerchant = await this.merchantRepository.save(merchantEntity);
      const imageURL = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`
      console.log("image url", imageURL)
      console.log("collection Id ", collection.id, " Merchant ID ", savedMerchant)
      const template = await this.crossmintService.createTemplate(collection.id, savedMerchant.id, {
        name: savedMerchant.businessName,
        description: savedMerchant.businessAddress,
        image: imageURL,
        symbol: savedMerchant.businessName,
      });
      console.log('Template of merchant', template);
      // Add collection ID to merchant entity
      
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

  async getDeployedEscrowAddress(factoryContract, txResponse) {
    // Wait for transaction to be mined
    const receipt = await txResponse.wait();
  
    // Create an ethers.js Interface from your factory contract ABI
    const iface = new Interface(factoryContract.interface.fragments);
  
    // Parse logs to find the EscrowDeployed event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "EscrowDeployed") {
          const escrowAddress = parsed.args.escrowAddress;
          console.log("✅ Escrow deployed at:", escrowAddress);
          return escrowAddress;
        }
      } catch (err) {
        // Ignore logs that don't match this interface
      }
    }
  
    throw new Error("❌ EscrowDeployed event not found in transaction logs");
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
      console.log('File', file);

      let imageIpfsHash = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file.buffer, { filename: file.originalname });

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
