import * as bcrypt from 'bcrypt';
import { Users } from '../entities/users.entity';

export const VERIFICATION_RESEND_SECONDS = Number(
  process.env.EMAIL_VERIFICATION_RESEND_SECONDS ?? 30,
);
export const VERIFICATION_EXPIRY_MINUTES = Number(
  process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES ?? 15,
);

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashVerificationCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function isVerificationCodeValid(
  code: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(code, hash);
}

export function getResendCooldownSeconds(user: Users): number {
  if (!user.verificationSentAt) {
    return 0;
  }
  const elapsedMs = Date.now() - user.verificationSentAt.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  return Math.max(0, VERIFICATION_RESEND_SECONDS - elapsedSeconds);
}

export function getVerificationExpiryDate(): Date {
  return new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);
}
