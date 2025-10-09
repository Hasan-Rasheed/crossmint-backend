import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Admin } from '../../database/tables/admin.entity';
import { Otp } from '../../database/tables/otp.entity';
import { Merchant } from '../../database/tables/merchant.entity';
import { Order } from '../../database/tables/order.entity';
import { Distribution } from '../../database/tables/distribution.entity';
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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Distribution)
    private readonly distributionRepository: Repository<Distribution>,
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

  // Reactivate admin
  async reactivateAdmin(id: number) {
    try {
      const admin = await this.adminRepository.findOne({ where: { id } });

      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      admin.isActive = true;
      await this.adminRepository.save(admin);

      this.logger.log(`Admin reactivated: ${admin.email}`);

      return {
        statusCode: 200,
        success: true,
        message: 'Admin reactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error reactivating admin:', error);
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

  // Dashboard: Get comprehensive analytics
  async getDashboardAnalytics() {
    try {
      // Note: You'll need to create Order entity and related tables
      // This is a placeholder structure showing what data to collect
      
      const analytics = {
        merchants: await this.getMerchantAnalytics(),
        platform: await this.getPlatformAnalytics(),
        payments: await this.getPaymentAnalytics(),
        distributions: await this.getDistributionAnalytics(),
      };

      return {
        statusCode: 200,
        success: true,
        message: 'Analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      this.logger.error('Error getting analytics:', error);
      throw new HttpException(
        'Failed to retrieve analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getMerchantAnalytics() {
    const merchants = await this.merchantRepository.find();
    
    const merchantsWithAnalytics = await Promise.all(
      merchants.map(async (merchant) => {
        // Get orders using relation
        const allOrders = await this.orderRepository.find({ 
          where: { merchant: { id: merchant.id } },
          relations: ['merchant']
        });
        
        const totalOrdersCreated = allOrders.length;
        
        const paidOrders = allOrders.filter(order => order.status === 'paid');
        const totalOrdersPaid = paidOrders.length;
        
        // Get actual amounts from distributions (since Order doesn't store amount)
        const distributions = await this.distributionRepository.find({
          where: { merchantId: merchant.id }
        });
        
        // Calculate totals from distributions
        const totalAmountDistributed = distributions.reduce((sum, dist) => sum + Number(dist.totalAmount), 0);
        const merchantShare = distributions.reduce((sum, dist) => sum + Number(dist.merchantAmount), 0);
        const platformFees = distributions.reduce((sum, dist) => sum + Number(dist.platformFees), 0);
        const actuallyReceived = distributions.filter(d => d.status === 'completed')
          .reduce((sum, dist) => sum + Number(dist.merchantAmount), 0);
        
        // Calculate pending amount
        const pendingAmount = merchantShare - actuallyReceived;

        return {
          businessName: merchant.businessName,
          contactInformation: merchant.contactInformation,
          businessAddress: merchant.businessAddress,
          receivingAddress: merchant.receivingAddress,
          contractAddress: merchant.contractAddress,
          collectionId: merchant.collectionId,
          storeURL: merchant.storeUrl,
          totalOrdersCreated,
          totalOrdersPaid,
          totalShareAmount: merchantShare, // 90% of total paid by customers
          totalFeesGenerated: platformFees, // 10% of total paid by customers
          actuallyReceivedFromPayouts: actuallyReceived,
          pendingAmountToBeReceived: pendingAmount,
        };
      })
    );

    return {
      totalMerchants: merchants.length,
      activeMerchants: merchants.filter(m => m.contractAddress).length,
      merchants: merchantsWithAnalytics,
    };
  }

  private async getPlatformAnalytics() {
    // Get all distributions
    const allDistributions = await this.distributionRepository.find();
    
    // Calculate total fees generated (10% from all paid orders)
    const totalFeesGenerated = allDistributions.reduce((sum, dist) => sum + Number(dist.platformFees), 0);
    
    // Calculate total fees actually received (completed distributions only)
    const completedDistributions = allDistributions.filter(d => d.status === 'completed');
    const totalFeesReceived = completedDistributions.reduce((sum, dist) => sum + Number(dist.platformFees), 0);
    
    // Calculate pending fees
    const pendingFees = totalFeesGenerated - totalFeesReceived;

    return {
      vaultAddress: process.env.PLATFORM_FEES_RECEIVING_ADDRESS,
      totalFeesGeneratedFromMerchants: totalFeesGenerated,
      totalFeesActuallyReceived: totalFeesReceived,
      totalPendingPaymentFromDailyDistribution: pendingFees,
    };
  }

  private async getPaymentAnalytics() {
    // TODO: Implement Crossmint payment tracking when needed
    return {
      pendingPayments: [],
      receivedPayments: [],
      expectedDistributions: [],
    };
  }

  private async getDistributionAnalytics() {
    // Get all distributions with merchant info
    const allDistributions = await this.distributionRepository.find({
      relations: ['merchant'],
      order: { distributedAt: 'DESC' }
    });

    // Format all distribution records
    const allDistributionRecords = allDistributions.map(dist => ({
      id: dist.id,
      merchantId: dist.merchantId,
      merchantName: dist.merchant?.businessName || 'Unknown',
      totalAmount: Number(dist.totalAmount),
      merchantAmount: Number(dist.merchantAmount),
      platformFees: Number(dist.platformFees),
      transactionHash: dist.transactionHash,
      status: dist.status,
      distributedAt: dist.distributedAt,
    }));

    // Get last distribution
    const lastDistribution = allDistributions[0] ? {
      id: allDistributions[0].id,
      distributedAt: allDistributions[0].distributedAt,
      totalAmount: Number(allDistributions[0].totalAmount),
      transactionHash: allDistributions[0].transactionHash,
    } : null;

    // Calculate total distributed
    const totalDistributed = allDistributions.reduce((sum, dist) => sum + Number(dist.totalAmount), 0);

    // Calculate pending amounts for all merchants
    const merchants = await this.merchantRepository.find();
    let totalRemainingMerchant = 0;
    let totalRemainingFees = 0;

    for (const merchant of merchants) {
      // Get distributions for this merchant
      const distributions = await this.distributionRepository.find({
        where: { merchantId: merchant.id }
      });
      
      // Calculate expected amounts from distributions
      const totalExpected = distributions.reduce((sum, dist) => sum + Number(dist.totalAmount), 0);
      const merchantExpected = distributions.reduce((sum, dist) => sum + Number(dist.merchantAmount), 0);
      const feesExpected = distributions.reduce((sum, dist) => sum + Number(dist.platformFees), 0);
      
      // Calculate what was actually received (completed only)
      const completedDist = distributions.filter(d => d.status === 'completed');
      const merchantReceived = completedDist.reduce((sum, dist) => sum + Number(dist.merchantAmount), 0);
      const feesReceived = completedDist.reduce((sum, dist) => sum + Number(dist.platformFees), 0);
      
      // Calculate remaining
      const merchantPending = merchantExpected - merchantReceived;
      const feesPending = feesExpected - feesReceived;
      
      totalRemainingMerchant += merchantPending > 0 ? merchantPending : 0;
      totalRemainingFees += feesPending > 0 ? feesPending : 0;
    }

    const totalPending = totalRemainingMerchant + totalRemainingFees;

    return {
      allDistributionRecords,
      lastDistributionHappened: lastDistribution,
      totalDistributed,
      totalPending,
      totalRemainingAmountOfAllMerchants: totalRemainingMerchant,
      totalRemainingFeesOfPlatform: totalRemainingFees,
    };
  }
}
