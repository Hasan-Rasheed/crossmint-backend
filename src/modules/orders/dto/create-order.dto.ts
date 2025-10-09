import { IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  merchantId: number;

  @IsString()
  crossmintId: string;

  @IsString()
  wooId: string;

  @IsString()
  storeUrl: string;

  @IsString()
  status: string;

  metadata: any;
}
