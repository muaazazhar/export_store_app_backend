export function getRequestBaseUrl(req: {
  protocol: string;
  get(name: string): string | undefined;
}): string {
  return `${req.protocol}://${req.get('host')}`;
}

export function buildApiBaseUrl(baseUrl: string): string {
  const apiPrefix = process.env.API_PREFIX?.trim();
  return apiPrefix ? `${baseUrl}/${apiPrefix}` : baseUrl;
}

export function buildApiResourceUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${buildApiBaseUrl(baseUrl)}${normalizedPath}`;
}
