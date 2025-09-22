import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MerchantsService } from 'src/modules/merchants/merchants.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly merchatService: MerchantsService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret',
    });
  }

  async validate(payload: any) {
    console.log('valdating user with payload: ', payload);
    const user = await this.merchatService.findById(payload.sub);
    console.log('👤 Request by user: ', user);

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
