import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("munkie.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT,
    total_ink REAL,
    total_area REAL,
    components_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    try {
      const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
      res.json(projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        date: p.date,
        totalInk: p.total_ink,
        totalArea: p.total_area,
        components: JSON.parse(p.components_json)
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", (req, res) => {
    const { id, name, date, totalInk, totalArea, components } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO projects (id, name, date, total_ink, total_area, components_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, name, date, totalInk, totalArea, JSON.stringify(components));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving project:", error);
      res.status(500).json({ error: "Failed to save project" });
    }
  });

  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM projects WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
