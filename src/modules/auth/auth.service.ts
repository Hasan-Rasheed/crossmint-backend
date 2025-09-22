import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class AuthService {
  constructor(
    private merchantsService: MerchantsService,
    private jwtService: JwtService,
  ) {}

  async createToken(createMerchantDto: any) {
    try {
      console.log('createMerchantDto', createMerchantDto);
      const { id, businessName } = createMerchantDto;

      const payload = { sub: id, businessName: businessName };
      return this.jwtService.sign(payload);
    } catch (err) {
      console.log('error', err);
    }
  }

  async signIn(businessName: string): Promise<{ access_token: string }> {
    try{
      const merchant =
      await this.merchantsService.findByBusinessName(businessName);

    if (!merchant) {
      throw new UnauthorizedException('Merchant not found');
    }

    const payload = { sub: merchant.businessName };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
    }
    catch(error) { 
      console.log("error in sign in",error)
      throw error
    }
   
  }
}
