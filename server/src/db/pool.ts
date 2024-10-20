import { Pool, QueryResultRow } from "pg";
import ConfigFile from "../config_file";
import chalk from "chalk";
import { log } from "../utils";

let pool: Pool | null = null;

export async function pgClient() {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  if (!pool) {
    if (!config) {
      throw new Error("Config file not found");
    }

    const databaseUrl = config.database_url;

    pool = new Pool({
      connectionString: databaseUrl,
    });
  }

  return pool;
}

export async function queryAndLog<T extends QueryResultRow>(
  sql: string,
  params: any[] = []
) {
  const pool = await pgClient(); // Retrieve the pool
  log("SQL: ", chalk.cyan(sql));
  return pool.query<T>(sql, params); // Use the pool directly for the query
}
