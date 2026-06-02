import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/users.entity';

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

  async findByEmailOrUsername(identifier: string): Promise<Users | null> {
    const normalized = identifier.trim().toLowerCase();
    const byEmail = await this.findByEmail(normalized);
    if (byEmail) {
      return byEmail;
    }
    return this.findByUsername(normalized);
  }

  findById(id: number): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  createUser(payload: {
    email: string;
    username: string;
    password: string;
    role?: string;
    isVerified?: boolean;
  }): Promise<Users> {
    const user = this.usersRepository.create({
      email: payload.email,
      username: payload.username,
      password: payload.password,
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
}
