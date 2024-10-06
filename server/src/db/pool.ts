import { Pool, QueryResultRow } from "pg";
import ConfigFile from "../config_file";
import chalk from "chalk";
import { log } from "../utils";

const pool: Pool | null = null;

export async function pgClient() {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  if (!pool) {
    if (!config) {
      throw new Error("Config file not found");
    }

    const databaseUrl = config.database_url;

    return new Pool({
      connectionString: databaseUrl,
    });
  }

  return pool.connect();
}

export async function queryAndLog<T extends QueryResultRow>(
  sql: string,
  params: any[] = []
) {
  const client = await pgClient();

  log("SQL: ", chalk.cyan(sql));

  const res = await client.query<T>(sql, params);
  return res;
}
