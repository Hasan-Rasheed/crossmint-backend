import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public routes (no auth required)
  
  @Post('create')
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return await this.adminService.createAdmin(createAdminDto);
  }

  @Post('request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return await this.adminService.requestOtp(requestOtpDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return await this.adminService.verifyOtp(verifyOtpDto);
  }

  // Protected routes (require JWT auth)

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/merchants')
  async getAllMerchants() {
    return await this.adminService.getAllMerchants();
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/merchants/:id')
  async getMerchantById(@Param('id') id: string) {
    return await this.adminService.getMerchantById(parseInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/stats')
  async getDashboardStats() {
    return await this.adminService.getDashboardStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getAllAdmins() {
    return await this.adminService.getAllAdmins();
  }

  @UseGuards(JwtAuthGuard)
  @Post('deactivate/:id')
  async deactivateAdmin(@Param('id') id: string) {
    return await this.adminService.deactivateAdmin(parseInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('reactivate/:id')
  async reactivateAdmin(@Param('id') id: string) {
    return await this.adminService.reactivateAdmin(parseInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('cleanup-otps')
  async cleanupOtps() {
    try {
      const count = await this.adminService.cleanupExpiredOtps();
      return {
        statusCode: 200,
        success: true,
        message: `Cleaned up ${count} expired OTPs`,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to cleanup OTPs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit/hashes')
  async auditAdminHashes() {
    return await this.adminService.auditAdminHashes();
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/analytics')
  async getDashboardAnalytics() {
    return await this.adminService.getDashboardAnalytics();
  }
}
