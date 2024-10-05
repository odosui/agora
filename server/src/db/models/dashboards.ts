import { pgClient } from "../pool";

const fields = ["uuid", "name", "created_at", "updated_at"].join(", ");

export type Dashboard = {
  uuid: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

export function dbToDto(db: Dashboard) {
  return {
    uuid: db.uuid,
    name: db.name,
    createdAt: db.created_at.toISOString(),
    updatedAt: db.updated_at.toISOString(),
  };
}

async function create(name: string) {
  const client = await pgClient();
  const res = await client.query<Dashboard>(
    `INSERT INTO dashboards (name) VALUES ($1) RETURNING ${fields}`,
    [name]
  );
  return res.rows[0];
}

async function all() {
  const client = await pgClient();
  const res = await client.query<Dashboard>(
    `SELECT ${fields} FROM dashboards ORDER BY ID DESC`
  );

  return res.rows;
}

async function findByUuid(uuid: string) {
  const client = await pgClient();
  const res = await client.query<Dashboard>(
    `SELECT ${fields} FROM dashboards WHERE uuid = $1`,
    [uuid]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
}

const Dashboards = {
  findByUuid,
  all,
  create,
};

export default Dashboards;
