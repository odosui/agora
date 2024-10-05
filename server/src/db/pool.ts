import { Pool } from "pg";
import ConfigFile from "../config_file";

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
