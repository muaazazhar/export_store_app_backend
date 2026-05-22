import type { LogLevel } from '@nestjs/common';

const ALLOWED_LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

export function getNestLogLevels(): LogLevel[] {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (!configured) {
    return process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'];
  }

  const selectedIndex = ALLOWED_LEVELS.indexOf(configured as LogLevel);
  if (selectedIndex === -1) {
    return ['error', 'warn', 'log'];
  }

  return ALLOWED_LEVELS.slice(0, selectedIndex + 1);
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}
