import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1', description: 'Merchant ID to fetch collection' })
  merchantId: string;

  @IsEmail()
  @ApiProperty({ example: 'customer@email.com', description: 'Customer email address' })
  email: string;


  @IsString()
  @ApiProperty({ example: 'https://store.example.com', description: 'Store URL' })
  storeUrl: string;

  @IsString()
  @IsIn(['card', 'crypto'])
  @ApiProperty({ 
    example: 'card', 
    description: 'Payment method: card or crypto',
    enum: ['card', 'crypto']
  })
  method: string;

  @IsString()
  @IsIn(['usd', 'usdc'])
  @ApiProperty({ 
    example: 'usd', 
    description: 'Payment currency: usd for stripe, usdc for crypto',
    enum: ['usd', 'usdc']
  })
  currency: string;

  @IsString()
  @ApiProperty({ example: '25.00', description: 'Total price for the purchase' })
  totalPrice: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: '0xabcd1234...', 
    description: 'Payer wallet address (required for crypto payments)',
    required: false
  })
  payerAddress?: string;

  @IsArray()
  cartData: any[];
} 