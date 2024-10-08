import { QueryResultRow } from "pg";
import { queryAndLog } from "./pool";

/**
 * Model is a set of functions to interact with a database table.
 */

export function createModel<T extends QueryResultRow>(
  tableName: string,
  fields: (keyof T)[]
) {
  const fieldsStr = fields.join(", ");

  // Create a new record in the table
  async function create(o: Partial<T>) {
    const names = Object.keys(o) as (keyof T)[];
    const values = names.map((n) => o[n]);

    const namesStr = names.join(", ");

    const res = await queryAndLog<T>(
      `INSERT INTO ${tableName} (${namesStr}) VALUES ($1, $2, $3) RETURNING ${fieldsStr}`,
      values
    );
    return res.rows[0];
  }

  // Find one record
  // If no record is found, return null
  // If more than one record is found, return the first one
  async function oneBy(
    fieldName: keyof T,
    value: string | number
  ): Promise<T | null> {
    const res = await queryAndLog<T>(
      `SELECT ${fieldsStr} FROM ${tableName} WHERE ${String(fieldName)} = $1`,
      [value]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0];
  }

  async function all() {
    const res = await queryAndLog<T>(`SELECT ${fieldsStr} FROM ${tableName}`);

    return res.rows;
  }

  async function allBy(
    fieldName: keyof T,
    value: string | number,
    order?: [keyof T, "ASC" | "DESC"]
  ) {
    let sql = `SELECT ${fieldsStr} FROM ${tableName} WHERE ${String(
      fieldName
    )} = $1`;

    if (order) {
      sql += ` ORDER BY ${String(order[0])} ${order[1]}`;
    }

    const res = await queryAndLog<T>(sql, [value]);

    return res.rows;
  }

  async function deleteBy(fieldName: keyof T, value: string | number) {
    await queryAndLog<T>(
      `DELETE FROM ${tableName} WHERE ${String(fieldName)} = $1`,
      [value]
    );
  }

  return {
    create,
    oneBy,
    allBy,
    all,
    deleteBy,
  };
}
