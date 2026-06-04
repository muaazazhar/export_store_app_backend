import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { VerifiedAuthGuard } from './verified-auth.guard';

@Global()
@Module({
  imports: [AuthModule, UsersModule],
  providers: [JwtAuthGuard, RolesGuard, VerifiedAuthGuard],
  exports: [JwtAuthGuard, RolesGuard, VerifiedAuthGuard],
})
export class AuthGuardsModule {}
