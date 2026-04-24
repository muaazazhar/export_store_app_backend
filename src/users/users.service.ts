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
  }): Promise<Users> {
    const user = this.usersRepository.create({
      email: payload.email,
      username: payload.username,
      password: payload.password,
      role: payload.role ?? 'user',
    });
    return this.usersRepository.save(user);
  }
}
