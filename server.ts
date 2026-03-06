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
    user_email TEXT,
    name TEXT,
    date TEXT,
    total_ink REAL,
    total_area REAL,
    components_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drafts (
    user_email TEXT PRIMARY KEY,
    project_name TEXT,
    components_json TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure all columns exist
try {
  const columns = db.prepare("PRAGMA table_info(projects)").all() as any[];
  const columnNames = columns.map(c => c.name);
  
  if (!columnNames.includes("user_email")) {
    db.exec("ALTER TABLE projects ADD COLUMN user_email TEXT;");
  }
  if (!columnNames.includes("total_ink")) {
    db.exec("ALTER TABLE projects ADD COLUMN total_ink REAL;");
  }
  if (!columnNames.includes("total_area")) {
    db.exec("ALTER TABLE projects ADD COLUMN total_area REAL;");
  }
} catch (e) {
  console.error("Migration error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    try {
      // Remove email filter to allow shared access as requested
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
    const { id, userEmail, name, date, totalInkMl, totalArea, components } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO projects (id, user_email, name, date, total_ink, total_area, components_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userEmail || 'anonymous', name, date, totalInkMl || 0, totalArea || 0, JSON.stringify(components));
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

  // Draft Routes
  app.get("/api/draft", (req, res) => {
    const userEmail = req.query.email as string;
    if (!userEmail) return res.status(400).json({ error: "Email required" });

    try {
      const draft: any = db.prepare("SELECT * FROM drafts WHERE user_email = ?").get(userEmail);
      if (draft) {
        res.json({
          projectName: draft.project_name,
          components: JSON.parse(draft.components_json)
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  });

  app.post("/api/draft", (req, res) => {
    const { userEmail, projectName, components } = req.body;
    if (!userEmail) return res.status(400).json({ error: "Email required" });

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO drafts (user_email, project_name, components_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(userEmail, projectName, JSON.stringify(components));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save draft" });
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
