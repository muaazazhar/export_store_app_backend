export function pickTrimmedString(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.trim();
}

export function pickNullableString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function pickBoolean(value: boolean | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Boolean(value);
}

export function pickFiniteNumber(
  value: number | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
