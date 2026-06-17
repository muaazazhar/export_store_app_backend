import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Users } from '../entities/users.entity';
import { VERIFICATION_RESEND_SECONDS } from './email-verification.util';

export const PASSWORD_RESET_EXPIRY_MINUTES = Number(
  process.env.PASSWORD_RESET_EXPIRY_MINUTES ?? 15,
);
export const PASSWORD_RESET_TOKEN_EXPIRY_SECONDS = Number(
  process.env.PASSWORD_RESET_TOKEN_EXPIRY_SECONDS ?? 900,
);
export const MAX_PASSWORD_RESET_ATTEMPTS = Number(
  process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? 5,
);
export const MIN_RESET_PASSWORD_LENGTH = 8;

export function getPasswordResetExpiryDate(): Date {
  return new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
}

export function getPasswordResetTokenExpiryDate(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_SECONDS * 1000);
}

export function getPasswordResetResendCooldownSeconds(user: Users): number {
  if (!user.passwordResetSentAt) {
    return 0;
  }
  const elapsedMs = Date.now() - user.passwordResetSentAt.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  return Math.max(0, VERIFICATION_RESEND_SECONDS - elapsedSeconds);
}

export async function generatePasswordResetToken(userId: string): Promise<{
  token: string;
  hash: string;
}> {
  const token = `${userId}.${randomUUID()}`;
  const hash = await bcrypt.hash(token, 10);
  return { token, hash };
}

export async function isPasswordResetTokenValid(
  token: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(token, hash);
}
