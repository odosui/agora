import { createModel } from "../create_model";

export type Message = {
  id: number;
  uuid: string;
  body: string;
  reasoning: string | null;
  kind: string;
  chat_id: number;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Message)[] = [
  "id",
  "uuid",
  "body",
  "reasoning",
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
    reasoning: m.reasoning,
    createdAt: m.created_at.toISOString(),
    updatedAt: m.updated_at.toISOString(),
  };
}

export type MessageDto = ReturnType<typeof messageDto>;

export default Messages;
