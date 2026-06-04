import { Body, Controller, Get, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Get('google')
  @Redirect()
  googleStart() {
    return { url: this.authService.getGoogleAuthStartUrl() };
  }

  @Get('google/callback')
  @Redirect()
  googleCallback(
    @Query('code') code?: string,
    @Query('id_token') idToken?: string,
    @Query('error') error?: string,
  ) {
    return { url: this.authService.buildGoogleCallbackRedirect(code, idToken, error) };
  }

  @Post('google/exchange')
  googleExchange(@Body() dto: GoogleExchangeDto) {
    return this.authService.exchangeGoogleAuth(dto);
  }
}
