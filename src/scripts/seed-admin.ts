import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const seedFirstAdmin = async () => {
  const dataSource = new DataSource({
    // type: 'postgres',
    // host: 'localhost',
    // port: 5432,
    // username: 'postgres',
    // password: process.env.DB_PASSWORD || 'root',
    // database: 'crossmint',
    type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Heroku SSL
      },
    entities: [__dirname + '/../database/tables/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const adminRepository = dataSource.getRepository('Admin');

    // Check if any admin exists
    const existingAdmins = await adminRepository.count();

    if (existingAdmins > 0) {
      console.log('⚠️  Admins already exist. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    // Create first admin
    const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL || 'admin@example.com';
    const firstAdminName = process.env.FIRST_ADMIN_NAME || 'Super Admin';
    const hashSecret = process.env.ADMIN_HASH_SECRET || 'admin-hash-secret-key';

    // Create admin with temporary hash first
    const admin = adminRepository.create({
      email: firstAdminEmail,
      name: firstAdminName,
      hash: 'temporary',
      isActive: true,
    });

    const savedAdmin = await adminRepository.save(admin);

    // Generate verifiable hash using HMAC (same as admin.service.ts)
    const data = `${savedAdmin.email}:${savedAdmin.createdAt.toISOString()}:official`;
    const verifiableHash = crypto
      .createHmac('sha256', hashSecret)
      .update(data)
      .digest('hex');

    // Update admin with verifiable hash
    savedAdmin.hash = verifiableHash;
    await adminRepository.save(savedAdmin);

    console.log('✅ First admin created successfully!');
    console.log(`📧 Email: ${firstAdminEmail}`);
    console.log(`👤 Name: ${firstAdminName}`);
    console.log('\n🔐 To login:');
    console.log('1. Use POST /admin/request-otp with the email');
    console.log('2. Check your email for OTP');
    console.log('3. Use POST /admin/verify-otp with email and OTP');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedFirstAdmin();
