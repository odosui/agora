import { createModel } from "../create_model";

export type Dashboard = {
  id: number;
  uuid: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Dashboard)[] = [
  "id",
  "uuid",
  "name",
  "created_at",
  "updated_at",
];

const Dashboards = createModel<Dashboard>("dashboards", fields);

export function dbToDto(db: Dashboard) {
  return {
    uuid: db.uuid,
    name: db.name,
    createdAt: db.created_at.toISOString(),
    updatedAt: db.updated_at.toISOString(),
  };
}

export type DashboardDto = ReturnType<typeof dbToDto>;

export default Dashboards;
