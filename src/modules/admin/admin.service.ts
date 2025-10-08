import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Admin } from '../../database/tables/admin.entity';
import { Otp } from '../../database/tables/otp.entity';
import { Merchant } from '../../database/tables/merchant.entity';
import { EmailService } from './email.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'default-secret-key';
  private readonly HASH_SECRET = process.env.ADMIN_HASH_SECRET || 'admin-hash-secret-key';

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  // Generate verifiable hash for admin
  private generateAdminHash(email: string, createdAt: Date): string {
    const data = `${email}:${createdAt.toISOString()}:official`;
    return crypto
      .createHmac('sha256', this.HASH_SECRET)
      .update(data)
      .digest('hex');
  }

  // Verify admin hash is legitimate
  private verifyAdminHash(email: string, hash: string, createdAt: Date): boolean {
    const expectedHash = this.generateAdminHash(email, createdAt);
    return hash === expectedHash;
  }

  // Create new admin
  async createAdmin(createAdminDto: CreateAdminDto) {
    try {
      // Verify secret key
      if (createAdminDto.secretKey !== this.ADMIN_SECRET_KEY) {
        throw new HttpException(
          'Invalid secret key. Unauthorized admin creation.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check if admin already exists
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: createAdminDto.email },
      });

      if (existingAdmin) {
        throw new HttpException(
          'Admin with this email already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Create admin with temporary hash (will be updated after save)
      const admin = this.adminRepository.create({
        email: createAdminDto.email,
        name: createAdminDto.name,
        hash: 'temporary', // Placeholder
        isActive: true,
      });

      const savedAdmin = await this.adminRepository.save(admin);

      // Generate verifiable hash using createdAt timestamp
      const verifiableHash = this.generateAdminHash(
        savedAdmin.email,
        savedAdmin.createdAt,
      );

      // Update admin with verifiable hash
      savedAdmin.hash = verifiableHash;
      await this.adminRepository.save(savedAdmin);

      // Send welcome email
      await this.emailService.sendWelcomeEmail(savedAdmin.email, savedAdmin.name);

      this.logger.log(`New admin created: ${savedAdmin.email}`);

      return {
        statusCode: 201,
        success: true,
        message: 'Admin created successfully',
        data: {
          id: savedAdmin.id,
          email: savedAdmin.email,
          name: savedAdmin.name,
          createdAt: savedAdmin.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Error creating admin:', error);
      throw error;
    }
  }

  // Request OTP for login
  async requestOtp(requestOtpDto: RequestOtpDto) {
    try {
      // Check if admin exists
      const admin = await this.adminRepository.findOne({
        where: { email: requestOtpDto.email, isActive: true },
      });

      if (!admin) {
        throw new HttpException(
          'Admin not found or inactive',
          HttpStatus.NOT_FOUND,
        );
      }

      // Verify admin hash to ensure legitimate creation
      const isValidHash = this.verifyAdminHash(
        admin.email,
        admin.hash,
        admin.createdAt,
      );

      if (!isValidHash) {
        this.logger.error(
          `Invalid admin hash detected for ${admin.email}. Possible unauthorized entry!`,
        );
        throw new HttpException(
          'Admin verification failed. Please contact system administrator.',
          HttpStatus.FORBIDDEN,
        );
      }

      // Invalidate all previous unused OTPs for this email
      await this.otpRepository.update(
        { email: requestOtpDto.email, isUsed: false },
        { isUsed: true },
      );

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiry time (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Save OTP
      const otpEntity = this.otpRepository.create({
        email: requestOtpDto.email,
        otp,
        expiresAt,
        isUsed: false,
      });

      await this.otpRepository.save(otpEntity);

      // Send OTP via email
      const emailSent = await this.emailService.sendOTP(requestOtpDto.email, otp);

      if (!emailSent) {
        throw new HttpException(
          'Failed to send OTP email',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(`OTP sent to ${requestOtpDto.email}`);

      return {
        statusCode: 200,
        success: true,
        message: 'OTP sent successfully to your email',
      };
    } catch (error) {
      this.logger.error('Error requesting OTP:', error);
      throw error;
    }
  }

  // Verify OTP and generate JWT token
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    try {
      // Find valid OTP
      const otpRecord = await this.otpRepository.findOne({
        where: {
          email: verifyOtpDto.email,
          otp: verifyOtpDto.otp,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otpRecord) {
        throw new HttpException(
          'Invalid OTP',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        throw new HttpException(
          'OTP has expired',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Mark OTP as used
      otpRecord.isUsed = true;
      await this.otpRepository.save(otpRecord);

      // Get admin details
      const admin = await this.adminRepository.findOne({
        where: { email: verifyOtpDto.email, isActive: true },
      });

      if (!admin) {
        throw new HttpException(
          'Admin not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Update last login
      admin.lastLoginAt = new Date();
      await this.adminRepository.save(admin);

      // Generate JWT token
      const payload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(`Admin logged in: ${admin.email}`);

      return {
        statusCode: 200,
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            lastLoginAt: admin.lastLoginAt,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  // Clean up expired OTPs (can be called by a cron job)
  async cleanupExpiredOtps() {
    try {
      const result = await this.otpRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.log(`Cleaned up ${result.affected} expired OTPs`);
      return result.affected;
    } catch (error) {
      this.logger.error('Error cleaning up OTPs:', error);
      throw error;
    }
  }

  // Dashboard: Get all merchants
  async getAllMerchants() {
    try {
      const merchants = await this.merchantRepository.find({
        order: { id: 'DESC' },
      });

      return {
        statusCode: 200,
        success: true,
        message: 'Merchants retrieved successfully',
        data: merchants,
      };
    } catch (error) {
      this.logger.error('Error getting merchants:', error);
      throw new HttpException(
        'Failed to retrieve merchants',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Dashboard: Get merchant by ID
  async getMerchantById(id: number) {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { id },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        success: true,
        message: 'Merchant retrieved successfully',
        data: merchant,
      };
    } catch (error) {
      this.logger.error('Error getting merchant:', error);
      throw error;
    }
  }

  // Dashboard: Get statistics
  async getDashboardStats() {
    try {
      const totalMerchants = await this.merchantRepository.count();
      const merchantsWithContracts = await this.merchantRepository.count({
        where: { contractAddress: Not('') },
      });
      const totalAdmins = await this.adminRepository.count();

      return {
        statusCode: 200,
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          totalMerchants,
          merchantsWithContracts,
          totalAdmins,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw new HttpException(
        'Failed to retrieve statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all admins (admin only)
  async getAllAdmins() {
    try {
      const admins = await this.adminRepository.find({
        select: ['id', 'email', 'name', 'isActive', 'createdAt', 'lastLoginAt'],
        order: { createdAt: 'DESC' },
      });

      return {
        statusCode: 200,
        success: true,
        message: 'Admins retrieved successfully',
        data: admins,
      };
    } catch (error) {
      this.logger.error('Error getting admins:', error);
      throw new HttpException(
        'Failed to retrieve admins',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Deactivate admin
  async deactivateAdmin(id: number) {
    try {
      const admin = await this.adminRepository.findOne({ where: { id } });

      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      admin.isActive = false;
      await this.adminRepository.save(admin);

      return {
        statusCode: 200,
        success: true,
        message: 'Admin deactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error deactivating admin:', error);
      throw error;
    }
  }

  // Audit: Check all admins for valid hashes
  async auditAdminHashes() {
    try {
      const allAdmins = await this.adminRepository.find();
      const results: Array<{
        id: number;
        email: string;
        name: string;
        isActive: boolean;
        hashValid: boolean;
        createdAt: Date;
      }> = [];

      for (const admin of allAdmins) {
        const isValid = this.verifyAdminHash(
          admin.email,
          admin.hash,
          admin.createdAt,
        );

        results.push({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          isActive: admin.isActive,
          hashValid: isValid,
          createdAt: admin.createdAt,
        });

        if (!isValid) {
          this.logger.warn(
            `⚠️  SECURITY ALERT: Admin ${admin.id} (${admin.email}) has INVALID hash!`,
          );
        }
      }

      const invalidCount = results.filter((r) => !r.hashValid).length;
      const validCount = results.filter((r) => r.hashValid).length;

      return {
        statusCode: 200,
        success: true,
        message: 'Admin hash audit completed',
        data: {
          total: allAdmins.length,
          valid: validCount,
          invalid: invalidCount,
          admins: results,
        },
      };
    } catch (error) {
      this.logger.error('Error auditing admin hashes:', error);
      throw new HttpException(
        'Failed to audit admin hashes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
