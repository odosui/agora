import express from "express";
import ConfigFile from "./config_file";
import Chats, { Chat, chatDto } from "./db/models/chats";
import Dashboards, { Dashboard, dbToDto } from "./db/models/dashboards";
import Messages, { messageDto } from "./db/models/messages";

const PORT = process.env.PORT || 3000;

export async function runRest() {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // allow CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Health check
  app.get("/", (_req, res) => {
    res.json({ status: "OK" });
  });

  app.get("/api/profiles", async (_req, res) => {
    try {
      const profiles = Object.keys(config?.profiles || {}).map((name) => ({
        name,
        vendor: config?.profiles[name].vendor,
        model: config?.profiles[name].model,
      }));
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/dashboards", async (_req, res) => {
    try {
      const dbs = await Dashboards.all();
      res.json(dbs.map(dbToDto));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.post("/api/dashboards", async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const db = await Dashboards.create(name);
      res.json(dbToDto(db));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.get("/api/dashboards/:id", async (req, res) => {
    const id = req.params.id;

    let db: Dashboard | null = null;

    try {
      db = await Dashboards.oneBy("uuid", id);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!db) {
      res.status(404).json({ error: "Dashboard not found" });
      return;
    }

    res.json(dbToDto(db));
  });

  app.get("/api/dashboards/:id/chats", async (req, res) => {
    const id = req.params.id;

    let db: Dashboard | null = null;

    try {
      db = await Dashboards.oneBy("uuid", id);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!db) {
      res.status(404).json({ error: "Dashboard not found" });
      return;
    }

    const chats = await Chats.allBy("dashboard_id", db.id);

    res.json(chats.map(chatDto));
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    const id = req.params.id;

    let chat: Chat | null = null;

    try {
      chat = await Chats.oneBy("uuid", id);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const messages = await Messages.allBy("chat_id", chat.id, [
      "created_at",
      "ASC",
    ]);

    res.json(messages.map(messageDto));
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  return server;
}
