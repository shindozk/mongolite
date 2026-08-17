export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface QueryFilter {
  [key: string]: {
    $eq?: unknown;
    $ne?: unknown;
    $gt?: unknown;
    $gte?: unknown;
    $lt?: unknown;
    $lte?: unknown;
    $in?: unknown[];
    $nin?: unknown[];
    $exists?: boolean;
    $regex?: RegExp | string;
    $or?: QueryFilter[];
    $and?: QueryFilter[];
  };
}

export interface SortOptions {
  [key: string]: 1 | -1;
}

export interface UpdateOptions {
  $set?: Partial<Record<string, unknown>>;
  $unset?: Partial<Record<string, unknown>>;
  $inc?: Partial<Record<string, number>>;
  $push?: Partial<Record<string, unknown>>;
  $pull?: Partial<Record<string, unknown>>;
}

export interface CollectionOptions {
  capped?: boolean;
  size?: number;
  max?: number;
}

export interface DatabaseConfig {
  path: string;
  autoSave?: boolean;
  saveIntervalMs?: number;
  strict?: boolean;
}
