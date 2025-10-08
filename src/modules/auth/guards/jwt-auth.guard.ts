import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.log('🔐 JWT Guard - Checking authorization...');
    this.logger.log(`Authorization Header: ${authHeader ? 'Present' : 'Missing'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    this.logger.log('🔍 JWT Guard - Handle Request');
    this.logger.log(`Error: ${err?.message || 'None'}`);
    this.logger.log(`User: ${user ? JSON.stringify(user) : 'None'}`);
    this.logger.log(`Info: ${info?.message || 'None'}`);
    
    if (err || !user) {
      this.logger.error('❌ JWT Guard - Authentication failed');
      throw err || new UnauthorizedException('Unauthorized access');
    }
    
    this.logger.log('✅ JWT Guard - Authentication successful');
    return user;
  }
}
