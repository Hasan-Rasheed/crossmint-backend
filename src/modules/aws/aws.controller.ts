import { Controller, Get, Post, Body } from '@nestjs/common';
import { AwsService } from './aws.service';

@Controller('aws')
export class AwsController {
  constructor(private readonly awsService: AwsService) {}

  // Simple health check endpoint
  @Get()
  getStatus() {
    return { message: 'AWS module is up and running 🚀' };
  }

  // Example: Encrypt data using AWS KMS
  @Post('encrypt')
  async encryptData(
    // @Body('text') text: string
  ) {
    const text = 'Hello from LocalStack';

    const encrypted = await this.awsService.encryptData(text);
    return { encrypted };
  }

  // Example: Decrypt data using AWS KMS
  @Post('decrypt')
  async decryptData(
    @Body('cipherText') cipherText: string
  ) {

   
    const decrypted = await this.awsService.decryptData(cipherText);
    return { decrypted };
  }
}
