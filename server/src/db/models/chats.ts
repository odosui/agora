import { queryAndLog } from "../pool";

export type Chat = {
  id: number;
  uuid: string;
  name: string;
  profile_name: string;
  dashboard_id: number;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Chat)[] = [
  "id",
  "uuid",
  "name",
  "profile_name",
  "created_at",
  "updated_at",
  "dashboard_id",
];

const fieldsStr = fields.join(", ");

export function chatDto(c: Chat) {
  return {
    uuid: c.uuid,
    name: c.name,
    profileName: c.profile_name,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
  };
}

async function create(name: string, dashboardId: number, profileName: string) {
  const res = await queryAndLog<Chat>(
    `INSERT INTO chats (name, dashboard_id, profile_name) VALUES ($1, $2, $3) RETURNING ${fieldsStr}`,
    [name, dashboardId, profileName]
  );
  return res.rows[0];
}

async function findByUuid(uuid: string) {
  const res = await queryAndLog<Chat>(
    `SELECT ${fieldsStr} FROM chats WHERE uuid = $1`,
    [uuid]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
}

async function allByDashboard(dbId: number) {
  const res = await queryAndLog<Chat>(
    `SELECT ${fieldsStr} FROM chats WHERE dashboard_id = $1`,
    [dbId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
}

const Chats = {
  create,
  findByUuid,
  allByDashboard,
};

export default Chats;
