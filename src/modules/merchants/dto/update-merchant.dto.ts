import { IsString, IsOptional } from 'class-validator';

export class UpdateMerchantDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  contactInformation?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  receivingAddress?: string;
}
