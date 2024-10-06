import fs from "fs";
import { Client } from "pg";
import ConfigFile from "../config_file";
import path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

async function main() {
  const config = await ConfigFile.readConfig();
  const databaseUrl = config?.database_url;
  if (!databaseUrl) {
    throw new Error("Database URL not found in config file.");
  }

  const client = await getDbConnection(databaseUrl);

  try {
    await createMigrationTable(client);

    const appliedMigrations = await getAppliedMigrations(client);
    const files = fs.readdirSync(MIGRATIONS_DIR);
    const sortedFiles = sort(files);

    for (const file of sortedFiles) {
      const migrationFile = path.join(MIGRATIONS_DIR, file);

      if (!appliedMigrations.has(file)) {
        console.log(`Applying ${file}...`);
        await applyMigration(client, migrationFile);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
    console.log("Closed connection to PostgreSQL database.");
  }
}

main();

async function getDbConnection(connectionString: string): Promise<Client> {
  const client = new Client({
    connectionString,
  });

  await client.connect();
  console.log("Connected to PostgreSQL database.");
  return client;
}

async function createMigrationTable(client: Client) {
  const query = `
       CREATE TABLE IF NOT EXISTS migrations (
         id SERIAL PRIMARY KEY,
         migration_file TEXT UNIQUE,
         applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
     `;

  await client.query(query);
}

async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const res = await client.query(
    "SELECT migration_file FROM migrations ORDER BY id"
  );
  const migrationFiles = res.rows.map((row) => row.migration_file);
  return new Set(migrationFiles);
}

async function applyMigration(client: Client, migrationFile: string) {
  try {
    const sql = fs.readFileSync(migrationFile, "utf8");
    await client.query(sql);
    await client.query("INSERT INTO migrations (migration_file) VALUES ($1)", [
      path.basename(migrationFile),
    ]);
  } catch (err: any) {
    throw new Error(
      `Error applying migration ${migrationFile}: ${err.message}`
    );
  }
}

// Sort migration files by their number
function sort(files: string[]): string[] {
  return files.sort((a, b) => {
    const aNum = parseInt(a.split("-")[0]);
    const bNum = parseInt(b.split("-")[0]);
    return aNum - bNum;
  });
}
