const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'client_secret',
  'jwt',
  'bearer',
  'code',
  'imageblob',
  'image_blob',
  'buffer',
]);

const SENSITIVE_KEY_PATTERNS = [/password/i, /secret/i, /token/i, /authorization/i];

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) {
    return true;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function maskValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === 'string') {
    if (value.length <= 4) {
      return '[REDACTED]';
    }
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  return '[REDACTED]';
}

export function sanitizeForLog<T>(value: T, depth = 0): T {
  if (depth > 6) {
    return '[MAX_DEPTH]' as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1)) as T;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return '[BINARY_REDACTED]' as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = maskValue(entry);
      continue;
    }
    result[key] = sanitizeForLog(entry, depth + 1);
  }
  return result as T;
}

export function sanitizeUrlForLog(url: string): string {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }

  const path = url.slice(0, queryIndex);
  const query = url.slice(queryIndex + 1);
  const params = new URLSearchParams(query);

  for (const key of params.keys()) {
    if (isSensitiveKey(key)) {
      params.set(key, '[REDACTED]');
    }
  }

  const sanitizedQuery = params.toString();
  return sanitizedQuery ? `${path}?${sanitizedQuery}` : path;
}
