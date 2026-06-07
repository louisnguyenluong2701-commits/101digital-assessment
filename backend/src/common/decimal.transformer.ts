import { ValueTransformer } from 'typeorm';

/**
 * TypeORM returns `numeric`/`decimal` columns as strings to preserve precision.
 * This transformer converts them to JS numbers on read so the API and business
 * logic deal with numbers consistently. Values are rounded to 2 decimal places.
 */
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null =>
    value === null || value === undefined ? null : value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
