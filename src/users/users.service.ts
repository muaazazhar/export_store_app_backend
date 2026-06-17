import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { normalizePhone } from '../common/validation/phone.util';
import { Users } from '../entities/users.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  findByEmail(email: string): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByUsername(username: string): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  findByPhone(phone: string): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async findByEmailOrUsername(identifier: string): Promise<Users | null> {
    const normalized = identifier.trim().toLowerCase();
    const byEmail = await this.findByEmail(normalized);
    if (byEmail) {
      return byEmail;
    }
    return this.findByUsername(normalized);
  }

  findById(id: string): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  createUser(payload: {
    email: string;
    username: string;
    password: string;
    phone?: string | null;
    role?: string;
    isVerified?: boolean;
    phoneVerified?: boolean;
  }): Promise<Users> {
    const user = this.usersRepository.create({
      email: payload.email,
      username: payload.username,
      password: payload.password,
      phone: payload.phone ?? null,
      phoneVerified: payload.phoneVerified ?? false,
      role: payload.role ?? 'user',
      isVerified: payload.isVerified ?? false,
    });
    return this.usersRepository.save(user);
  }

  save(user: Users): Promise<Users> {
    return this.usersRepository.save(user);
  }

  async setVerificationToken(
    user: Users,
    tokenHash: string,
    expiresAt: Date,
    sentAt: Date,
  ): Promise<Users> {
    user.verificationTokenHash = tokenHash;
    user.verificationTokenExpiresAt = expiresAt;
    user.verificationSentAt = sentAt;
    return this.usersRepository.save(user);
  }

  async markEmailVerified(user: Users): Promise<Users> {
    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    return this.usersRepository.save(user);
  }

  async setPasswordResetCode(
    user: Users,
    codeHash: string,
    expiresAt: Date,
    sentAt: Date,
  ): Promise<Users> {
    user.passwordResetCodeHash = codeHash;
    user.passwordResetCodeExpiresAt = expiresAt;
    user.passwordResetSentAt = sentAt;
    user.passwordResetAttempts = 0;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    return this.usersRepository.save(user);
  }

  async incrementPasswordResetAttempts(user: Users): Promise<Users> {
    user.passwordResetAttempts += 1;
    return this.usersRepository.save(user);
  }

  async clearPasswordResetCode(user: Users): Promise<Users> {
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetAttempts = 0;
    return this.usersRepository.save(user);
  }

  async setPasswordResetToken(
    user: Users,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<Users> {
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetTokenExpiresAt = expiresAt;
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetAttempts = 0;
    return this.usersRepository.save(user);
  }

  async clearPasswordResetState(user: Users): Promise<Users> {
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetSentAt = null;
    user.passwordResetAttempts = 0;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    return this.usersRepository.save(user);
  }

  async updatePassword(user: Users, passwordHash: string): Promise<Users> {
    user.password = passwordHash;
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Users> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hasUsername = dto.username !== undefined;
    const hasPhone =
      dto.phone !== undefined || dto.phone_number !== undefined;

    if (!hasUsername && !hasPhone) {
      throw new BadRequestException(
        'At least one of username or phone must be provided',
      );
    }

    if (hasUsername) {
      const username = dto.username?.trim().toLowerCase() ?? '';
      if (!username) {
        throw new BadRequestException('Username cannot be empty');
      }
      if (username.includes(' ')) {
        throw new BadRequestException('Username cannot contain spaces');
      }
      const existing = await this.findByUsername(username);
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Username already registered');
      }
      user.username = username;
    }

    if (hasPhone) {
      const phoneRaw = dto.phone ?? dto.phone_number;
      if (!phoneRaw?.trim()) {
        throw new BadRequestException({
          message: 'Phone number is required.',
          code: 'PHONE_REQUIRED',
        });
      }
      const phone = normalizePhone(phoneRaw);
      if (!phone) {
        throw new BadRequestException({
          message: 'Enter a valid phone number.',
          code: 'PHONE_INVALID',
        });
      }
      const existing = await this.findByPhone(phone);
      if (existing && existing.id !== userId) {
        throw new BadRequestException({
          message: 'This phone number is already registered.',
          code: 'PHONE_ALREADY_EXISTS',
        });
      }
      if (user.phone !== phone) {
        user.phone = phone;
        user.phoneVerified = false;
      }
    }

    return this.usersRepository.save(user);
  }

  async verifyCurrentPassword(userId: string, password: string): Promise<void> {
    const trimmed = password?.trim();
    if (!trimmed) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(trimmed, user.password);
    if (!isValid) {
      throw new UnauthorizedException({
        message: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
    }
  }

  async removeById(id: string): Promise<void> {
    await this.usersRepository.delete({ id });
  }
}
