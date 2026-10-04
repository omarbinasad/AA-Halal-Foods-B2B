/** Opaque identifier. Backends may use numeric ids; the frontend always treats them as strings. */
export type ID = string;

/**
 * Amount in the store currency (`siteConfig.currency`, BDT by default), in major units (taka).
 * Mock data uses whole taka; whether the backend sends decimals (paisa) is still to be agreed.
 */
export type Money = number;

/** ISO-8601 date-time string, e.g. "2026-09-30T09:00:00+06:00" (store time zone offset). */
export type ISODateString = string;

export type WeightUnit = "g" | "kg";

export interface Weight {
  value: number;
  unit: WeightUnit;
}

export interface PageQuery {
  /** 1-based page number. */
  page?: number;
  perPage?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/**
 * Field-level validation errors keyed by field path, e.g. "name" or "variations.2.sku"
 * (matches the API's `error.fields`, one message per field).
 */
export type FieldErrors = Record<string, string>;
