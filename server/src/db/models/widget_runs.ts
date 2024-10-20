import { createModel } from "../create_model";

export type WidgetRun = {
  id: number;
  widget_id: number;
  uuid: string;
  input: string;
  output: string;
  error: string;
  status: "running" | "finished" | "error";
  created_at: Date;
  updated_at: Date;
  finished_at: Date;
};

const fields: (keyof WidgetRun)[] = [
  "id",
  "uuid",
  "input",
  "output",
  "error",
  "status",
  "created_at",
  "updated_at",
  "finished_at",
  "widget_id",
];

const WidgetRuns = createModel<WidgetRun>("widget_runs", fields);

export function widgetRunDto(c: WidgetRun) {
  return {
    uuid: c.uuid,
    output: c.output,
    error: c.error,
    status: c.status,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
    finishedAt: c.finished_at ? c.finished_at.toISOString() : null,
  };
}

export type WidgetRunDto = ReturnType<typeof widgetRunDto>;

export default WidgetRuns;

export const lastRunOfWidget = async (widgetId: number) => {
  const res = await WidgetRuns.allBy("widget_id", widgetId, [
    "created_at",
    "DESC",
  ]);

  if (res.length === 0) {
    return null;
  }

  return res[0];
};
