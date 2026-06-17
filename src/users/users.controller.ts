import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { toPublicUser } from '../common/users/public-user.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    return toPublicUser(updated);
  }

  @Post('me/verify-password')
  async verifyPassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyPasswordDto,
  ) {
    await this.usersService.verifyCurrentPassword(user.userId, dto.password);
    return { valid: true };
  }
}
