export const paginationFields = [
  "page",
  "limit",
  "sortBy",
  "sortOrder",
  "searchTerm",
] as const;

export type TPaginationFields = (typeof paginationFields)[number];
