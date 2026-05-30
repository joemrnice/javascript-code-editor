const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'editor.db');
const db = new sqlite3.Database(DB_PATH);

// Initialize schema
db.serialize(() => {
  // Folders table
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `);

  // Files table
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT,
      content TEXT DEFAULT '',
      language TEXT DEFAULT 'javascript',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `);

  // Insert root folder if not exists
  db.get("SELECT id FROM folders WHERE id = 'root'", (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)",
        ['root', 'Project', null]
      );
      
      // Seed with welcome file
      const welcomeId = uuidv4();
      const welcomeContent = `// Welcome to JavaScript Code Editor v2.0
// This is a modern, full-featured code editor with:
// - SQLite-backed file explorer
// - Monaco Editor with syntax highlighting
// - Secure code execution
// - Resizable panels and modern UI

function greet(name) {
  return \`Hello, \${name}! Welcome to the future of coding.\`;
}

console.log(greet('Developer'));

// Try editing this file or create new ones!
// Use Ctrl+Enter to run code instantly.`;
      
      db.run(
        "INSERT INTO files (id, name, folder_id, content, language) VALUES (?, ?, ?, ?, ?)",
        [welcomeId, 'welcome.js', 'root', welcomeContent, 'javascript']
      );
    }
  });
});

// Promisified helpers
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// Folder operations
const folders = {
  async create(name, parentId = 'root') {
    const id = uuidv4();
    await dbAsync.run(
      'INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)',
      [id, name, parentId]
    );
    return { id, name, parent_id: parentId };
  },

  async getAll() {
    return dbAsync.all('SELECT * FROM folders ORDER BY created_at ASC');
  },

  async getById(id) {
    return dbAsync.get('SELECT * FROM folders WHERE id = ?', [id]);
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (fields.length === 0) return null;
    values.push(id);
    await dbAsync.run(
      `UPDATE folders SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id) {
    // SQLite CASCADE handles files
    const result = await dbAsync.run('DELETE FROM folders WHERE id = ?', [id]);
    return result.changes > 0;
  }
};

// File operations
const files = {
  async create(name, folderId = 'root', content = '', language = 'javascript') {
    const id = uuidv4();
    await dbAsync.run(
      'INSERT INTO files (id, name, folder_id, content, language) VALUES (?, ?, ?, ?, ?)',
      [id, name, folderId, content, language]
    );
    return { id, name, folder_id: folderId, content, language };
  },

  async getAll() {
    return dbAsync.all('SELECT * FROM files ORDER BY updated_at DESC');
  },

  async getById(id) {
    return dbAsync.get('SELECT * FROM files WHERE id = ?', [id]);
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.language !== undefined) {
      fields.push('language = ?');
      values.push(updates.language);
    }
    if (updates.folder_id !== undefined) {
      fields.push('folder_id = ?');
      values.push(updates.folder_id);
    }
    if (fields.length === 0) return null;
    values.push(id);
    await dbAsync.run(
      `UPDATE files SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id) {
    const result = await dbAsync.run('DELETE FROM files WHERE id = ?', [id]);
    return result.changes > 0;
  },

  async search(query) {
    return dbAsync.all(
      "SELECT * FROM files WHERE name LIKE ? OR content LIKE ?",
      [`%${query}%`, `%${query}%`]
    );
  }
};

module.exports = { db, folders, files };