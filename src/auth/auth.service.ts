import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const password = dto.password?.trim();
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

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email,
      username,
      password: hashedPassword,
      role: 'user',
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
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

    return {
      access_token: this.jwtService.sign({
        userId: user.id,
        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
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
    console.log(
      `[Google OAuth][start] client_id=${clientId?.slice(0, 12)}... redirect_uri=${redirectUri}`,
    );
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
      });
    }

    return {
      access_token: this.jwtService.sign({
        userId: user.id,
        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
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
    console.log(
      `[Google OAuth][exchange] client_id=${clientId.slice(0, 12)}... redirect_uri=${redirectUri} code_prefix=${code.slice(0, 12)}...`,
    );

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
      throw new UnauthorizedException(`Google code exchange failed (${reason})`);
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
