import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { sanitizeUrlForLog } from '../logging/sanitize.util';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const safeUrl = sanitizeUrlForLog(request.originalUrl);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response.statusCode;
          const line = `${request.method} ${safeUrl} -> ${statusCode} (${durationMs}ms)`;

          if (statusCode >= 500) {
            this.logger.error(line);
            return;
          }
          if (statusCode >= 400) {
            this.logger.warn(line);
            return;
          }
          this.logger.log(line);
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response.statusCode || 500;
          const line = `${request.method} ${safeUrl} -> ${statusCode} (${durationMs}ms)`;
          this.logger.error(line, error instanceof Error ? error.stack : undefined);
        },
      }),
    );
  }
}
