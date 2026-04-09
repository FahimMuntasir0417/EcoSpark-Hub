import { Prisma } from "../generated/prisma/browser";

type SortOrder = "asc" | "desc";

interface IQueryBuilderOptions {
  query: Record<string, unknown>;
  searchableFields?: string[];
  filterableFields?: string[];
  sortableFields?: string[];
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
  baseWhere?: Prisma.InputJsonValue | Record<string, unknown>;
}

interface IQueryBuilderResult {
  where: Record<string, unknown>;
  skip: number;
  take: number;
  orderBy: Record<string, SortOrder>;
  meta: {
    page: number;
    limit: number;
  };
}

export class QueryBuilder {
  private query: Record<string, unknown>;
  private searchableFields: string[];
  private filterableFields: string[];
  private sortableFields: string[];
  private defaultSortBy: string;
  private defaultSortOrder: SortOrder;
  private baseWhere: Record<string, unknown>;

  constructor(options: IQueryBuilderOptions) {
    this.query = options.query;
    this.searchableFields = options.searchableFields || [];
    this.filterableFields = options.filterableFields || [];
    this.sortableFields = options.sortableFields || [];
    this.defaultSortBy = options.defaultSortBy || "createdAt";
    this.defaultSortOrder = options.defaultSortOrder || "desc";
    this.baseWhere =
      typeof options.baseWhere === "object" && options.baseWhere !== null
        ? (options.baseWhere as Record<string, unknown>)
        : {};
  }

  private getPage(): number {
    const page = Number(this.query.page);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  private getLimit(): number {
    const limit = Number(this.query.limit);
    return Number.isFinite(limit) && limit > 0 ? limit : 10;
  }

  private getSearchTerm(): string | undefined {
    const searchTerm = this.query.searchTerm;
    return typeof searchTerm === "string" && searchTerm.trim()
      ? searchTerm.trim()
      : undefined;
  }

  private getSortBy(): string {
    const sortBy =
      typeof this.query.sortBy === "string"
        ? this.query.sortBy
        : this.defaultSortBy;

    if (!this.sortableFields.length) {
      return this.defaultSortBy;
    }

    return this.sortableFields.includes(sortBy) ? sortBy : this.defaultSortBy;
  }

  private getSortOrder(): SortOrder {
    return this.query.sortOrder === "asc" ? "asc" : this.defaultSortOrder;
  }

  private buildSearchConditions(): Record<string, unknown>[] {
    const searchTerm = this.getSearchTerm();

    if (!searchTerm || !this.searchableFields.length) {
      return [];
    }

    return this.searchableFields.map((field) => {
      if (field.includes(".")) {
        const parts = field.split(".");
        return this.buildNestedContains(parts, searchTerm);
      }

      return {
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      };
    });
  }

  private buildNestedContains(
    parts: string[],
    value: string,
  ): Record<string, unknown> {
    if (parts.length === 1) {
      return {
        [parts[0]]: {
          contains: value,
          mode: "insensitive",
        },
      };
    }

    const [first, ...rest] = parts;
    return {
      [first]: this.buildNestedContains(rest, value),
    };
  }

  private buildFilterConditions(): Record<string, unknown>[] {
    const conditions: Record<string, unknown>[] = [];

    for (const field of this.filterableFields) {
      const value = this.query[field];

      if (value === undefined) continue;

      if (value === "true") {
        conditions.push({ [field]: true });
        continue;
      }

      if (value === "false") {
        conditions.push({ [field]: false });
        continue;
      }

      if (field.includes(".")) {
        const parts = field.split(".");
        conditions.push(this.buildNestedEquals(parts, value));
        continue;
      }

      conditions.push({ [field]: value });
    }

    return conditions;
  }

  private buildNestedEquals(
    parts: string[],
    value: unknown,
  ): Record<string, unknown> {
    if (parts.length === 1) {
      return {
        [parts[0]]: value,
      };
    }

    const [first, ...rest] = parts;
    return {
      [first]: this.buildNestedEquals(rest, value),
    };
  }

  build(): IQueryBuilderResult {
    const page = this.getPage();
    const limit = this.getLimit();
    const skip = (page - 1) * limit;
    const take = limit;
    const sortBy = this.getSortBy();
    const sortOrder = this.getSortOrder();

    const andConditions: Record<string, unknown>[] = [];

    if (Object.keys(this.baseWhere).length) {
      andConditions.push(this.baseWhere);
    }

    const searchConditions = this.buildSearchConditions();
    if (searchConditions.length) {
      andConditions.push({
        OR: searchConditions,
      });
    }

    const filterConditions = this.buildFilterConditions();
    if (filterConditions.length) {
      andConditions.push(...filterConditions);
    }

    const where =
      andConditions.length > 0
        ? {
            AND: andConditions,
          }
        : {};

    return {
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      meta: {
        page,
        limit,
      },
    };
  }
}
