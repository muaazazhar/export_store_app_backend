import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isProductionEnv } from '../logging/log-level.util';

interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  email?: string;
  resendAvailableInSeconds?: number;
  verificationEmailSent?: boolean;
  requiresVerification?: boolean;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = this.extractMessage(exceptionResponse, exception);
    const errorLabel = this.getErrorLabel(status);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.originalUrl} -> ${status}: ${this.messageToText(message)}`,
      );
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      message: this.toClientMessage(status, message),
      error: errorLabel,
      ...this.extractExtraFields(exceptionResponse),
    };

    response.status(status).json(body);
  }

  private extractMessage(
    exceptionResponse: string | object | null,
    exception: unknown,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const payloadMessage = (exceptionResponse as { message?: unknown }).message;
      if (typeof payloadMessage === 'string' || Array.isArray(payloadMessage)) {
        return payloadMessage;
      }
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return 'Unexpected error';
  }

  private toClientMessage(
    status: number,
    message: string | string[],
  ): string | string[] {
    if (status < 500) {
      return message;
    }

    if (isProductionEnv()) {
      return 'Something went wrong. Please try again later.';
    }

    return message;
  }

  private messageToText(message: string | string[]): string {
    return Array.isArray(message) ? message.join(', ') : message;
  }

  private extractExtraFields(
    exceptionResponse: string | object | null,
  ): Pick<
    ApiErrorResponse,
    | 'code'
    | 'email'
    | 'resendAvailableInSeconds'
    | 'verificationEmailSent'
    | 'requiresVerification'
  > {
    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return {};
    }

    const payload = exceptionResponse as Record<string, unknown>;
    const extra: Pick<
      ApiErrorResponse,
      | 'code'
      | 'email'
      | 'resendAvailableInSeconds'
      | 'verificationEmailSent'
      | 'requiresVerification'
    > = {};

    if (typeof payload.code === 'string') {
      extra.code = payload.code;
    }
    if (typeof payload.email === 'string') {
      extra.email = payload.email;
    }
    if (typeof payload.resendAvailableInSeconds === 'number') {
      extra.resendAvailableInSeconds = payload.resendAvailableInSeconds;
    }
    if (typeof payload.verificationEmailSent === 'boolean') {
      extra.verificationEmailSent = payload.verificationEmailSent;
    }
    if (typeof payload.requiresVerification === 'boolean') {
      extra.requiresVerification = payload.requiresVerification;
    }

    return extra;
  }

  private getErrorLabel(status: number): string {
    const labels: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return labels[status] ?? 'Error';
  }
}
