import { createModel } from "../create_model";

export type Chat = {
  id: number;
  uuid: string;
  name: string;
  profile_name: string;
  dashboard_id: number;
  position: string;
  created_at: Date;
  updated_at: Date;
};

const fields: (keyof Chat)[] = [
  "id",
  "uuid",
  "name",
  "profile_name",
  "position",
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
    position: parsePosition(c.position),
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
  };
}

export type ChatDto = ReturnType<typeof chatDto>;

export default Chats;

export function parsePosition(pos: string) {
  try {
    const res = JSON.parse(pos) as {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    return res;
  } catch (error) {
    return null;
  }
}
