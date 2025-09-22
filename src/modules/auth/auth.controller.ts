import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // @Post('login')
  // async signIn(@Body() body: { businessName: string }) {
  //   return this.authService.signIn(body.businessName);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Get('test')
  // getProfile(@Req() req: any) {
  //   return req.user;
  // }
}
