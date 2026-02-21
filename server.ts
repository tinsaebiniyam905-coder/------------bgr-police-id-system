import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("police_system.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_number TEXT UNIQUE,
    full_name TEXT NOT NULL,
    rank TEXT NOT NULL,
    responsibility TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    photo_url TEXT,
    left_flag_url TEXT,
    center_logo_url TEXT,
    right_flag_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(members)").all() as any[];
const columnNames = tableInfo.map(col => col.name);

if (!columnNames.includes('left_flag_url')) {
  db.exec("ALTER TABLE members ADD COLUMN left_flag_url TEXT");
}
if (!columnNames.includes('center_logo_url')) {
  db.exec("ALTER TABLE members ADD COLUMN center_logo_url TEXT");
}
if (!columnNames.includes('right_flag_url')) {
  db.exec("ALTER TABLE members ADD COLUMN right_flag_url TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    scanner_info TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/members", (req, res) => {
    const { full_name, rank, responsibility, phone_number, photo_url, left_flag_url, center_logo_url, right_flag_url } = req.body;
    
    // Generate ID Number: BGR-POL-XXXX
    const lastMember = db.prepare("SELECT id FROM members ORDER BY id DESC LIMIT 1").get();
    const nextId = (lastMember?.id || 0) + 1;
    const id_number = `BGR-POL-${String(nextId).padStart(4, '0')}`;

    try {
      const stmt = db.prepare(`
        INSERT INTO members (id_number, full_name, rank, responsibility, phone_number, photo_url, left_flag_url, center_logo_url, right_flag_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(id_number, full_name, rank, responsibility, phone_number, photo_url, left_flag_url, center_logo_url, right_flag_url);
      res.json({ id: result.lastInsertRowid, id_number });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/members/search", (req, res) => {
    const query = req.query.query as string;
    if (!query) return res.status(400).json({ error: "Query is required" });

    try {
      const members = db.prepare(`
        SELECT * FROM members 
        WHERE id_number LIKE ? 
        OR full_name LIKE ? 
        OR phone_number LIKE ?
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/members", (req, res) => {
    try {
      const members = db.prepare("SELECT * FROM members ORDER BY full_name COLLATE NOCASE ASC").all();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/members/:id_number", (req, res) => {
    const member = db.prepare("SELECT * FROM members WHERE id_number = ?").get(req.params.id_number);
    if (member) {
      res.json(member);
    } else {
      res.status(404).json({ error: "Member not found" });
    }
  });

  app.post("/api/scan", (req, res) => {
    const { id_number, scanner_info } = req.body;
    const member = db.prepare("SELECT id FROM members WHERE id_number = ?").get(id_number);
    
    if (member) {
      db.prepare("INSERT INTO scans (member_id, scanner_info) VALUES (?, ?)").run(member.id, scanner_info);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Member not found" });
    }
  });

  app.get("/api/stats", (req, res) => {
    const totalMembers = db.prepare("SELECT COUNT(*) as count FROM members").get().count;
    const totalScans = db.prepare("SELECT COUNT(*) as count FROM scans").get().count;
    res.json({ totalMembers, totalScans });
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
