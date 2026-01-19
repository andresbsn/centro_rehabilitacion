/**
 * Utilidades de paginación compartidas
 */

export function parsePagination(query, defaults = { page: 1, pageSize: 20, maxPageSize: 100 }) {
  const page = Number(query.page || defaults.page);
  const pageSize = Number(query.pageSize || defaults.pageSize);

  const safePage = Number.isFinite(page) && page > 0 ? page : defaults.page;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 && pageSize <= defaults.maxPageSize 
    ? pageSize 
    : defaults.pageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize
  };
}

export function paginatedResponse(items, total, pagination) {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize)
  };
}
