import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Officer, sequelize } from '../models/index.js';

/**
 * Seed script to create the initial administrative officer account
 * Usage: node scripts/seedAdmin.js
 */
async function seedAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database for seeding...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crimeportal.gov';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminName = process.env.ADMIN_NAME || 'Super Administrator';

    // Check if admin already exists
    const existingAdmin = await Officer.findOne({ where: { email: adminEmail } });
    if (existingAdmin) {
      console.log(`Admin account with email "${adminEmail}" already exists. (ID: ${existingAdmin.id})`);
      process.exit(0);
    }

    // Hash password with bcrypt salt rounds = 10
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create the admin record
    const admin = await Officer.create({
      name: adminName,
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin'
    });

    console.log('='.repeat(65));
    console.log('INITIAL ADMIN ACCOUNT SEEDED SUCCESSFULLY!');
    console.log(`    ID    : ${admin.id}`);
    console.log(`    Name  : ${admin.name}`);
    console.log(`    Email : ${admin.email}`);
    console.log(`    Role  : ${admin.role}`);
    console.log(`    Password : ${adminPassword}`);
    console.log('='.repeat(65));

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedAdmin();
