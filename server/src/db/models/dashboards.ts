import { queryAndLog } from "../pool";

const fields = ["id", "uuid", "name", "created_at", "updated_at"].join(", ");

export type Dashboard = {
  id: number;
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

export type DashboardDto = ReturnType<typeof dbToDto>;

async function create(name: string) {
  const res = await queryAndLog<Dashboard>(
    `INSERT INTO dashboards (name) VALUES ($1) RETURNING ${fields}`,
    [name]
  );
  return res.rows[0];
}

async function all() {
  const res = await queryAndLog<Dashboard>(
    `SELECT ${fields} FROM dashboards ORDER BY ID DESC`
  );

  return res.rows;
}

async function findByUuid(uuid: string) {
  const res = await queryAndLog<Dashboard>(
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
