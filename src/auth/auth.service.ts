import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../common/email/email.service';
import { toPublicUser } from '../common/users/public-user.util';
import { Users } from '../entities/users.entity';
import { UsersService } from '../users/users.service';
import {
  generateVerificationCode,
  getResendCooldownSeconds,
  getVerificationExpiryDate,
  hashVerificationCode,
  isVerificationCodeValid,
  VERIFICATION_RESEND_SECONDS,
} from './email-verification.util';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendResetOtpDto } from './dto/resend-reset-otp.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import {
  generatePasswordResetToken,
  getPasswordResetExpiryDate,
  getPasswordResetResendCooldownSeconds,
  getPasswordResetTokenExpiryDate,
  isPasswordResetTokenValid,
  MAX_PASSWORD_RESET_ATTEMPTS,
  MIN_RESET_PASSWORD_LENGTH,
  PASSWORD_RESET_TOKEN_EXPIRY_SECONDS,
} from './password-reset.util';
import { normalizePhone } from '../common/validation/phone.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const password = dto.password?.trim();
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

    if (!email || !username || !password || password.length < 6) {
      throw new BadRequestException(
        'Email, username and password are required (password min 6 chars)',
      );
    }
    if (username.includes(' ')) {
      throw new BadRequestException('Username cannot contain spaces');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
    const existingByUsername = await this.usersService.findByUsername(username);
    if (existingByUsername) {
      throw new BadRequestException('Username already registered');
    }
    const existingByPhone = await this.usersService.findByPhone(phone);
    if (existingByPhone) {
      throw new BadRequestException({
        message: 'This phone number is already registered.',
        code: 'PHONE_ALREADY_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let user: Users | undefined;
    try {
      user = await this.usersService.createUser({
        email,
        username,
        phone,
        password: hashedPassword,
        role: 'user',
        isVerified: false,
        phoneVerified: false,
      });
      await this.issueAndSendVerificationCode(user);
    } catch (error) {
      if (user?.id) {
        await this.usersService.removeById(user.id);
        this.logger.warn(
          `Rolled back registration for ${email} because verification email could not be sent`,
        );
      }
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Unable to complete registration. Please try again later.',
      );
    }

    return {
      requiresVerification: true,
      message: 'Verification code sent to your email.',
      email: user.email,
      resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
      user: toPublicUser(user),
    };
  }

  async login(dto: LoginDto) {
    const identifier = (dto.identifier ?? dto.email)?.trim().toLowerCase();
    const password = dto.password?.trim();
    if (!identifier || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.findByEmailOrUsername(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      const { resendAvailableInSeconds, verificationEmailSent } =
        await this.trySendVerificationForUnverifiedUser(user);

      throw new ForbiddenException({
        message: verificationEmailSent
          ? 'Please verify your email. A verification code has been sent.'
          : resendAvailableInSeconds > 0
            ? `Please verify your email. You can resend a code in ${resendAvailableInSeconds} seconds.`
            : 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        resendAvailableInSeconds,
        verificationEmailSent,
        requiresVerification: true,
      });
    }

    return this.buildAuthResponse(user);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = dto.email?.trim().toLowerCase();
    const code = dto.code?.trim();
    if (!email || !code) {
      throw new BadRequestException('Email and verification code are required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }
    if (user.isVerified) {
      return this.buildAuthResponse(user);
    }

    if (
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new code.',
      );
    }

    const isCodeValid = await isVerificationCodeValid(
      code,
      user.verificationTokenHash,
    );
    if (!isCodeValid) {
      throw new BadRequestException('Invalid verification code');
    }

    const verifiedUser = await this.usersService.markEmailVerified(user);
    return this.buildAuthResponse(verifiedUser);
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message: 'If the account exists, a verification code has been sent.',
        email,
        resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
      };
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const cooldownSeconds = getResendCooldownSeconds(user);
    if (cooldownSeconds > 0) {
      throw new BadRequestException({
        message: `Please wait ${cooldownSeconds} seconds before resending.`,
        code: 'RESEND_COOLDOWN',
        email: user.email,
        resendAvailableInSeconds: cooldownSeconds,
      });
    }

    await this.issueAndSendVerificationCode(user);

    return {
      message: 'Verification code sent to your email.',
      email: user.email,
      resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('A valid email is required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return this.buildForgotPasswordSuccessResponse(email);
    }

    await this.issuePasswordResetCodeIfAllowed(user);
    return this.buildForgotPasswordSuccessResponse(email);
  }

  async resendResetOtp(dto: ResendResetOtpDto) {
    const email = this.normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('A valid email is required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message: 'Reset code sent.',
        email,
        resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
      };
    }

    await this.issuePasswordResetCodeIfAllowed(user);
    return {
      message: 'Reset code sent.',
      email: user.email,
      resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
    };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const email = this.normalizeEmail(dto.email);
    const code = dto.code?.trim();
    if (!email || !code) {
      throw new BadRequestException('Email and verification code are required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired code.',
        code: 'INVALID_RESET_CODE',
      });
    }

    if (user.passwordResetAttempts >= MAX_PASSWORD_RESET_ATTEMPTS) {
      throw new BadRequestException({
        message: 'Too many attempts. Request a new code.',
        code: 'RESET_CODE_LOCKED',
      });
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException({
        message: 'Invalid or expired code.',
        code: 'INVALID_RESET_CODE',
      });
    }

    const isCodeValid = await isVerificationCodeValid(
      code,
      user.passwordResetCodeHash,
    );
    if (!isCodeValid) {
      const updated = await this.usersService.incrementPasswordResetAttempts(user);
      if (updated.passwordResetAttempts >= MAX_PASSWORD_RESET_ATTEMPTS) {
        throw new BadRequestException({
          message: 'Too many attempts. Request a new code.',
          code: 'RESET_CODE_LOCKED',
        });
      }
      throw new BadRequestException({
        message: 'Invalid or expired code.',
        code: 'INVALID_RESET_CODE',
      });
    }

    const { token, hash } = await generatePasswordResetToken(user.id);
    await this.usersService.setPasswordResetToken(
      user,
      hash,
      getPasswordResetTokenExpiryDate(),
    );

    return {
      message: 'Code verified. You can set a new password.',
      resetToken: token,
      expiresInSeconds: PASSWORD_RESET_TOKEN_EXPIRY_SECONDS,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = dto.resetToken?.trim();
    const newPassword = dto.newPassword?.trim();
    const confirmPassword = dto.confirmPassword?.trim();

    if (!resetToken) {
      throw new UnauthorizedException({
        message: 'Invalid reset token',
        code: 'RESET_TOKEN_INVALID',
      });
    }

    if (!newPassword || !confirmPassword) {
      throw new BadRequestException('New password and confirmation are required');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException({
        message: 'Passwords do not match',
        code: 'PASSWORDS_DO_NOT_MATCH',
      });
    }

    if (newPassword.length < MIN_RESET_PASSWORD_LENGTH) {
      throw new BadRequestException({
        message: `Password must be at least ${MIN_RESET_PASSWORD_LENGTH} characters`,
        code: 'WEAK_PASSWORD',
      });
    }

    const userId = resetToken.split('.')[0];
    const user = await this.usersService.findById(userId);
    if (!user?.passwordResetTokenHash) {
      throw new UnauthorizedException({
        message: 'Invalid reset token',
        code: 'RESET_TOKEN_INVALID',
      });
    }

    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException({
        message: 'Reset link expired, request a new code',
        code: 'RESET_TOKEN_EXPIRED',
      });
    }

    const isTokenValid = await isPasswordResetTokenValid(
      resetToken,
      user.passwordResetTokenHash,
    );
    if (!isTokenValid) {
      throw new UnauthorizedException({
        message: 'Invalid reset token',
        code: 'RESET_TOKEN_INVALID',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user, passwordHash);
    await this.usersService.clearPasswordResetState(user);

    return {
      message: 'Password updated successfully.',
    };
  }

  private normalizeEmail(raw?: string): string | null {
    const email = raw?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return null;
    }
    return email;
  }

  private buildForgotPasswordSuccessResponse(email: string) {
    return {
      message:
        'If an account exists for this email, a reset code has been sent.',
      email,
      resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
    };
  }

  private async issuePasswordResetCodeIfAllowed(user: Users): Promise<void> {
    const cooldownSeconds = getPasswordResetResendCooldownSeconds(user);
    if (cooldownSeconds > 0) {
      throw new HttpException(
        {
          message: 'Please wait before requesting another code.',
          code: 'RESEND_COOLDOWN',
          resendAvailableInSeconds: cooldownSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateVerificationCode();
    const codeHash = await hashVerificationCode(code);
    const expiresAt = getPasswordResetExpiryDate();
    const sentAt = new Date();

    await this.usersService.setPasswordResetCode(
      user,
      codeHash,
      expiresAt,
      sentAt,
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, code);
    } catch {
      throw new InternalServerErrorException(
        'Unable to send password reset email. Please try again later.',
      );
    }
  }

  private async trySendVerificationForUnverifiedUser(user: Users): Promise<{
    resendAvailableInSeconds: number;
    verificationEmailSent: boolean;
  }> {
    const cooldownSeconds = getResendCooldownSeconds(user);
    if (cooldownSeconds > 0) {
      return {
        resendAvailableInSeconds: cooldownSeconds,
        verificationEmailSent: false,
      };
    }

    try {
      await this.issueAndSendVerificationCode(user);
      return {
        resendAvailableInSeconds: VERIFICATION_RESEND_SECONDS,
        verificationEmailSent: true,
      };
    } catch (error) {
      this.logger.warn(
        `Could not send verification email on login for ${user.email}`,
        error instanceof Error ? error.message : undefined,
      );
      return {
        resendAvailableInSeconds: 0,
        verificationEmailSent: false,
      };
    }
  }

  private async issueAndSendVerificationCode(user: Users): Promise<void> {
    const code = generateVerificationCode();
    const tokenHash = await hashVerificationCode(code);
    const expiresAt = getVerificationExpiryDate();
    const sentAt = new Date();

    await this.usersService.setVerificationToken(
      user,
      tokenHash,
      expiresAt,
      sentAt,
    );

    try {
      await this.emailService.sendVerificationEmail(user.email, code);
    } catch {
      throw new InternalServerErrorException(
        'Unable to send verification email. Please try again later.',
      );
    }
  }

  private buildAuthResponse(user: Users) {
    return {
      access_token: this.jwtService.sign({
        userId: user.id,
        role: user.role,
      }),
      user: toPublicUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }
    return toPublicUser(user);
  }

  getGoogleAuthStartUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be configured',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    this.logger.debug('Google OAuth start requested');
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  buildGoogleCallbackRedirect(code?: string, idToken?: string, error?: string): string {
    const appCallbackUrl = process.env.GOOGLE_APP_CALLBACK_URL;
    if (!appCallbackUrl) {
      throw new InternalServerErrorException('GOOGLE_APP_CALLBACK_URL must be configured');
    }

    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (idToken) params.set('id_token', idToken);
    if (error) params.set('error', error);

    const query = params.toString();
    return query ? `${appCallbackUrl}?${query}` : appCallbackUrl;
  }

  async exchangeGoogleAuth(dto: GoogleExchangeDto) {
    const code = this.normalizeGoogleAuthCode(dto.code);
    const idTokenFromBody = dto.id_token?.trim();
    if (!code && !idTokenFromBody) {
      throw new BadRequestException('Either code or id_token is required');
    }

    const idToken = idTokenFromBody ?? (await this.exchangeCodeForIdToken(code!));
    const googleProfile = await this.validateGoogleIdToken(idToken);

    const email = googleProfile.email?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Google account email is missing');
    }

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      const usernameBase = this.normalizeUsernameFromEmail(email);
      const username = await this.getAvailableUsername(usernameBase);
      const generatedPasswordHash = await bcrypt.hash(
        `google:${googleProfile.sub}:${Date.now()}`,
        10,
      );
      user = await this.usersService.createUser({
        email,
        username,
        password: generatedPasswordHash,
        role: 'user',
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      user = await this.usersService.save(user);
    }

    return this.buildAuthResponse(user);
  }

  private normalizeGoogleAuthCode(rawCode?: string): string | undefined {
    if (!rawCode) {
      return undefined;
    }

    let code = rawCode.trim();

    // If client sent full callback URL, extract ?code=...
    if (code.includes('://') || code.includes('?')) {
      try {
        const parsedUrl = new URL(code);
        const urlCode = parsedUrl.searchParams.get('code');
        if (urlCode) {
          code = urlCode;
        }
      } catch {
        const queryLike = code.includes('?') ? code.split('?')[1] ?? code : code;
        const params = new URLSearchParams(queryLike);
        const qpCode = params.get('code');
        if (qpCode) {
          code = qpCode;
        }
      }
    }

    // If client sent full query string, extract code field
    if (code.includes('&') && code.includes('code=')) {
      const params = new URLSearchParams(code);
      const qpCode = params.get('code');
      if (qpCode) {
        code = qpCode;
      }
    }
    if (code.startsWith('code=')) {
      code = code.slice('code='.length);
    }

    try {
      code = decodeURIComponent(code);
    } catch {
      // Keep original value when decode fails.
    }

    // Some clients accidentally turn '+' into spaces during query parsing.
    code = code.replace(/ /g, '+');

    return code;
  }

  private async exchangeCodeForIdToken(code: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI are required',
      );
    }
    this.logger.debug('Google OAuth code exchange started');

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as
        | { error?: string; error_description?: string }
        | null;
      const reason = errorPayload?.error
        ? `${errorPayload.error}${
            errorPayload.error_description
              ? `: ${errorPayload.error_description}`
              : ''
          }`
        : `HTTP ${response.status}`;
      this.logger.warn(`Google OAuth code exchange failed: ${reason}`);
      throw new UnauthorizedException(
        'Google sign-in failed. Please try again.',
      );
    }

    const tokenResult = (await response.json()) as { id_token?: string };
    if (!tokenResult.id_token) {
      throw new UnauthorizedException('Google token response missing id_token');
    }
    return tokenResult.id_token;
  }

  private async validateGoogleIdToken(idToken: string): Promise<{ email: string; sub: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID is required');
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google id_token');
    }

    const payload = (await response.json()) as {
      aud?: string;
      email?: string;
      sub?: string;
      email_verified?: string;
    };

    if (payload.aud !== clientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }
    if (!payload.email || payload.email_verified !== 'true' || !payload.sub) {
      throw new UnauthorizedException('Invalid Google account payload');
    }

    return { email: payload.email, sub: payload.sub };
  }

  private normalizeUsernameFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? 'user';
    const normalized = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return normalized || 'user';
  }

  private async getAvailableUsername(base: string): Promise<string> {
    let username = base;
    let suffix = 1;
    while (await this.usersService.findByUsername(username)) {
      username = `${base}${suffix}`;
      suffix += 1;
    }
    return username;
  }
}
