import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';

interface RequestWithHeaders {
  headers: Record<string, string | undefined>;
  user?: {
    userId: string;
    role: string;
    email: string;
    username: string;
    isVerified: boolean;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        role: string;
      }>(token);

      const user = await this.usersService.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedException({
          message: 'Unauthorized',
        });
      }

      request.user = {
        userId: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const isExpired =
        error instanceof Error &&
        (error.name === 'TokenExpiredError' || error.message?.includes('expired'));
      if (isExpired) {
        throw new UnauthorizedException({
          message: 'Unauthorized',
          code: 'TOKEN_EXPIRED',
        });
      }
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }
  }
}
