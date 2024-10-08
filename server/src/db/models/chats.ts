import { createModel } from "../create_model";

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

const Chats = createModel<Chat>("chats", fields);

export function chatDto(c: Chat) {
  return {
    uuid: c.uuid,
    name: c.name,
    profileName: c.profile_name,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
  };
}

export type ChatDto = ReturnType<typeof chatDto>;

export default Chats;
