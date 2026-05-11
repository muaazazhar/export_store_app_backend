import { Body, Controller, Get, Post, Query, Redirect } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
