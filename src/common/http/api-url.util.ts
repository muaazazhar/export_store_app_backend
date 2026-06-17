type RequestLike = {
  protocol: string;
  get(name: string): string | undefined;
};

/** Origin without /api — used to build imageUrl and other public asset URLs. */
export function getConfiguredPublicBaseUrl(): string | null {
  const raw = process.env.PUBLIC_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/+$/, '').replace(/\/api$/, '');
}

export function getRequestBaseUrl(req: RequestLike): string {
  const configured = getConfiguredPublicBaseUrl();
  if (configured) {
    return configured;
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  let protocol =
    forwardedProto?.split(',')[0]?.trim().toLowerCase() ?? req.protocol;
  const host =
    forwardedHost?.split(',')[0]?.trim() ?? req.get('host') ?? 'localhost';

  // Railway/reverse proxies often terminate TLS; Node sees http without trust proxy.
  if (protocol === 'http' && process.env.NODE_ENV === 'production') {
    protocol = 'https';
  }

  return `${protocol}://${host}`;
}

export function buildApiBaseUrl(baseUrl: string): string {
  const apiPrefix = process.env.API_PREFIX?.trim();
  return apiPrefix ? `${baseUrl}/${apiPrefix}` : baseUrl;
}

export function buildApiResourceUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${buildApiBaseUrl(baseUrl)}${normalizedPath}`;
}
