import type { QueryFilter } from "../types/database.ts";

export function parseQuery(queryString: string): QueryFilter {
  try {
    return JSON.parse(queryString) as QueryFilter;
  } catch {
    const filter: QueryFilter = {};
    const pairs = queryString.split(",");
    for (const pair of pairs) {
      const [key, value] = pair.split("=");
      if (key && value) {
        filter[key.trim()] = value.trim().startsWith("{") ? JSON.parse(value.trim()) : value.trim();
      }
    }
    return filter;
  }
}
