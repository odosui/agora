import { createModel } from "../create_model";
import { WidgetRun, widgetRunDto } from "./widget_runs";

export type Widget = {
  id: number;
  dashboard_id: number;
  uuid: string;
  name: string;
  input: string;
  template_name: string;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Widget)[] = [
  "id",
  "uuid",
  "name",
  "input",
  "template_name",
  "created_at",
  "updated_at",
  "dashboard_id",
];

const Widgets = createModel<Widget>("widgets", fields);

export function widgetDto(c: Widget, lastRun: WidgetRun | null) {
  return {
    uuid: c.uuid,
    name: c.name,
    templateName: c.template_name,
    input: c.input,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
    lastRun: lastRun ? widgetRunDto(lastRun) : null,
  };
}

export type WidgetDto = ReturnType<typeof widgetDto>;

export default Widgets;
