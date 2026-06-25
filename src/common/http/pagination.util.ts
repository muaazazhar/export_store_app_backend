export const MAX_PAGE_LIMIT = 50;

export type ParsedPaginationQuery = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaultLimit: number,
): ParsedPaginationQuery {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Math.floor(Number(query.limit) || defaultLimit)),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function toPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}

export function paginateArray<T>(
  items: T[],
  query: Record<string, unknown>,
  defaultLimit: number,
): PaginatedResponse<T> {
  const { page, limit, skip } = parsePaginationQuery(query, defaultLimit);
  const total = items.length;
  const data = items.slice(skip, skip + limit);
  return toPaginatedResponse(data, page, limit, total);
}
