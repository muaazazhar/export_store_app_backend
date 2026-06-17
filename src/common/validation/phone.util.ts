const E164_REGEX = /^\+[1-9]\d{9,14}$/;

export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw?.trim()) {
    return null;
  }

  let digits = raw.trim().replace(/[\s\-().]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }

  if (!/^\d{10,15}$/.test(digits)) {
    return null;
  }

  const normalized = `+${digits}`;
  return E164_REGEX.test(normalized) ? normalized : null;
}

export function isValidPhone(raw: string | undefined | null): boolean {
  return normalizePhone(raw) !== null;
}
