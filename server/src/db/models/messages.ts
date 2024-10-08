import { createModel } from "../create_model";

// id serial primary key,
// uuid uuid not null default uuid_generate_v4(),
// body text not null,
// kind varchar(255) not null,
// chat_id integer not null,
// created_at timestamp not null default now(),
// updated_at timestamp not null default now(),

export type Message = {
  id: number;
  uuid: string;
  body: string;
  kind: string;
  chat_id: number;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Message)[] = [
  "id",
  "uuid",
  "body",
  "kind",
  "chat_id",
  "created_at",
  "updated_at",
];

const Messages = createModel<Message>("messages", fields);

export function messageDto(m: Message) {
  return {
    uuid: m.uuid,
    kind: m.kind,
    body: m.body,
    createdAt: m.created_at.toISOString(),
    updatedAt: m.updated_at.toISOString(),
  };
}

export type MessageDto = ReturnType<typeof messageDto>;

export default Messages;
