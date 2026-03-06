import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "https://ryribunuudxgbexllbxe.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_9ymMbI_vKDPxpN0hZNnvVw_CWLq9j8b";

// Only initialize if we have both URL and Key
let supabase: any = null;
if (supabaseUrl && supabaseKey && !supabaseKey.startsWith('sb_publishable_')) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else if (supabaseUrl && supabaseKey) {
  // Use hardcoded ones if they look like real keys (not placeholders)
  supabase = createClient(supabaseUrl, supabaseKey);
}

if (supabase) {
  console.log("Supabase client initialized. Using cloud database.");
  // Verify connection and tables
  supabase.from('projects').select('id', { count: 'exact', head: true }).limit(1)
    .then(({ error }: { error: any }) => {
      if (error) {
        console.error("Supabase connection error:", error.message);
        if (error.code === '42P01') {
          console.error("Table 'projects' does not exist in Supabase. Please create it.");
        }
      } else {
        console.log("Supabase connection verified: 'projects' table is accessible.");
      }
    });

  supabase.from('drafts').select('user_email', { count: 'exact', head: true }).limit(1)
    .then(({ error }: { error: any }) => {
      if (error && error.code === '42P01') {
        console.error("Table 'drafts' does not exist in Supabase. Please create it.");
      } else if (!error) {
        console.log("Supabase connection verified: 'drafts' table is accessible.");
      }
    });
} else {
  console.log("Supabase credentials missing or invalid. Falling back to local SQLite.");
}

// SQLite Setup (Fallback)
const db = new Database("munkie.db");
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Supabase error fetching projects:", JSON.stringify(error, null, 2));
          throw error;
        }
        
        return res.json(data.map((p: any) => ({
          id: p.id,
          name: p.name,
          date: p.date,
          totalInkMl: p.total_ink,
          totalArea: p.total_area,
          components: typeof p.components_json === 'string' ? JSON.parse(p.components_json) : p.components_json
        })));
      }

      // Fallback to SQLite
      const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
      res.json(projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        date: p.date,
        totalInkMl: p.total_ink,
        totalArea: p.total_area,
        components: JSON.parse(p.components_json)
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    const { id, userEmail, name, date, totalInkMl, totalArea, components } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      if (supabase) {
        const { error } = await supabase
          .from('projects')
          .upsert({
            id,
            user_email: userEmail || 'anonymous',
            name,
            date,
            total_ink: totalInkMl || 0,
            total_area: totalArea || 0,
            components_json: components
          });
        
        if (error) {
          console.error("Supabase error saving project:", JSON.stringify(error, null, 2));
          throw error;
        }
        return res.json({ success: true });
      }

      // Fallback to SQLite
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

  app.delete("/api/projects/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (supabase) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        return res.json({ success: true });
      }

      db.prepare("DELETE FROM projects WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Draft Routes
  app.get("/api/draft", async (req, res) => {
    const userEmail = req.query.email as string;
    if (!userEmail) return res.status(400).json({ error: "Email required" });

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('user_email', userEmail)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
        
        if (data) {
          return res.json({
            projectName: data.project_name,
            components: typeof data.components_json === 'string' ? JSON.parse(data.components_json) : data.components_json
          });
        }
        return res.json(null);
      }

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
      console.error("Error fetching draft:", error);
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  });

  app.post("/api/draft", async (req, res) => {
    const { userEmail, projectName, components } = req.body;
    if (!userEmail) return res.status(400).json({ error: "Email required" });

    try {
      if (supabase) {
        const { error } = await supabase
          .from('drafts')
          .upsert({
            user_email: userEmail,
            project_name: projectName,
            components_json: components,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
        return res.json({ success: true });
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO drafts (user_email, project_name, components_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(userEmail, projectName, JSON.stringify(components));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving draft:", error);
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
