import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

interface RequestWithUser {
  user?: {
    isVerified: boolean;
    role: string;
  };
}

@Injectable()
export class VerifiedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === 'admin') {
      return true;
    }

    if (!user.isVerified) {
      throw new ForbiddenException({
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return true;
  }
}
