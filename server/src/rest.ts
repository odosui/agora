import express from "express";
import ConfigFile from "./config_file";
import Chats, { Chat, chatDto } from "./db/models/chats";
import Dashboards, { Dashboard, dbToDto } from "./db/models/dashboards";
import Messages, { messageDto } from "./db/models/messages";
import { lastRunOfWidget } from "./db/models/widget_runs";
import Widgets, { widgetDto } from "./db/models/widgets";
import { templates } from "./tasks/templates";
import { url2md } from "./url2md";

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
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE");
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
      res.json({
        profiles,
        templates,
      });
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
      const { name }: { name: string } = req.body;

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const db = await Dashboards.create({ name });
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

  app.delete("/api/dashboards/:uuid", async (req, res) => {
    const uuid = req.params.uuid;

    let db: Dashboard | null = null;

    try {
      db = await Dashboards.oneBy("uuid", uuid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!db) {
      res.status(404).json({ error: "Dashboard not found" });
      return;
    }

    // detele chats first
    await Chats.deleteBy("dashboard_id", db.id);
    await Widgets.deleteBy("dashboard_id", db.id);
    await Dashboards.deleteBy("uuid", uuid);

    res.json({ success: true });
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

  app.get("/api/dashboards/:id/widgets", async (req, res) => {
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

    const widgets = await Widgets.allBy("dashboard_id", db.id);

    const o = [];
    for (const widget of widgets) {
      const lastRun = await lastRunOfWidget(widget.id);
      o.push(widgetDto(widget, lastRun));
    }

    res.json(o);
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

  app.patch("/api/widgets/:id", async (req, res) => {
    const uuid = req.params.id;

    let widget = null;

    try {
      widget = await Widgets.oneBy("uuid", uuid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!widget) {
      res.status(404).json({ error: "Widget not found" });
      return;
    }

    const { name, input, position, templateName: template_name } = req.body;

    const payload = position ? { position } : { name, input, template_name };

    try {
      console.log("Updating widget", widget.id, payload);
      const w = await Widgets.update(widget.id, payload);
      const lastRun = await lastRunOfWidget(w.id);
      res.json(widgetDto(w, lastRun));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.patch("/api/chats/:id", async (req, res) => {
    const uuid = req.params.id;

    let chat = null;

    try {
      chat = await Chats.oneBy("uuid", uuid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const { position } = req.body;

    const payload = { position };

    try {
      const c = await Chats.update(chat.id, payload);
      res.json(chatDto(c));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.get("/api/md", async (req, res) => {
    const url = req.query.url;
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const md = await url2md(String(url));
    // download as markdown file

    res.setHeader("Content-Disposition", `attachment; filename=test.md`);
    res.setHeader("Content-Type", "text/markdown");

    res.send(md);
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  return server;
}
