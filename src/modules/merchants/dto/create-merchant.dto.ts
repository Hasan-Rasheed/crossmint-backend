import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  contactInformation: string;

  @IsString()
  @IsNotEmpty()
  businessAddress: string;

  @IsString()
  @IsNotEmpty()
  receivingAddress: string;

  @IsString()
  @IsNotEmpty()
  storeUrl: string;
}
