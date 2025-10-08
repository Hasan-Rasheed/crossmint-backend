import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_CONFIG } from '../../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_CONFIG.secret,
    });
  }

  async validate(payload: any) {
    console.log('Validating JWT payload:', payload);

    // Check if payload has required fields
    if (!payload.sub || !payload.email) {
      console.log('❌ Invalid payload - missing sub or email');
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user info from token
    // For admins: payload has { sub, email, name, role: 'admin' }
    // For merchants: payload has { sub, email, ... }
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'user',
    };

    console.log('✅ JWT validated for user:', user.email, 'Role:', user.role);
    return user;
  }
}
