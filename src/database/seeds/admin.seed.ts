import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import dataSource from '../data-source';
import { Users } from '../../entities/users.entity';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !username || !password) {
    throw new Error('ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD are required');
  }

  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(Users);

  const hashedPassword = await bcrypt.hash(password, 10);
  let admin = await usersRepository.findOne({ where: [{ email }, { username }] });

  if (!admin) {
    admin = usersRepository.create({
      email,
      username,
      password: hashedPassword,
      role: 'admin',
    });
  } else {
    admin.email = email;
    admin.username = username;
    admin.password = hashedPassword;
    admin.role = 'admin';
  }

  await usersRepository.save(admin);
  await dataSource.destroy();

  console.log(`Admin user ready: email=${email}, username=${username}`);
}

seedAdmin().catch(async (error: unknown) => {
  console.error('Admin seed failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
