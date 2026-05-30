const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { folders, files } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure tmp directory exists
const TMP_DIR = path.join(__dirname, 'tmp');
(async () => {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch (e) {}
})();

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../web-client')));

// ===== FOLDER ROUTES =====

// Get all folders
app.get('/api/folders', async (req, res) => {
  try {
    const allFolders = await folders.getAll();
    res.json({ success: true, data: allFolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name, parent_id = 'root' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    const folder = await folders.create(name, parent_id);
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update folder
app.put('/api/folders/:id', async (req, res) => {
  try {
    const folder = await folders.update(req.params.id, req.body);
    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete folder
app.delete('/api/folders/:id', async (req, res) => {
  try {
    // Prevent deleting root
    if (req.params.id === 'root') {
      return res.status(403).json({ success: false, error: 'Cannot delete root folder' });
    }
    const deleted = await folders.delete(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== FILE ROUTES =====

// Get all files
app.get('/api/files', async (req, res) => {
  try {
    const allFiles = await files.getAll();
    res.json({ success: true, data: allFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single file
app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await files.getById(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: 'File not found' });
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create file
app.post('/api/files', async (req, res) => {
  try {
    const { name, folder_id = 'root', content = '', language } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    
    // Auto-detect language from extension
    const detectedLang = language || detectLanguage(name);
    const file = await files.create(name, folder_id, content, detectedLang);
    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update file
app.put('/api/files/:id', async (req, res) => {
  try {
    const file = await files.update(req.params.id, req.body);
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const deleted = await files.delete(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search files
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    const results = await files.search(q);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== CODE EXECUTION =====

app.post('/api/execute', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'No code provided' });

    const fileName = `${uuidv4()}.js`;
    const filePath = path.join(TMP_DIR, fileName);
    
    await fs.writeFile(filePath, code, 'utf8');
    
    const startTime = Date.now();
    
    exec(`node "${filePath}"`, { 
      timeout: 5000, 
      maxBuffer: 1024 * 1024,
      cwd: TMP_DIR
    }, async (error, stdout, stderr) => {
      // Cleanup
      try { await fs.unlink(filePath); } catch (e) {}
      
      const executionTime = Date.now() - startTime;
      
      if (error && error.killed) {
        return res.json({
          success: false,
          output: stdout,
          error: 'Execution timeout (5s exceeded)',
          executionTime
        });
      }
      
      res.json({
        success: !error,
        output: stdout,
        error: stderr || (error ? error.message : ''),
        executionTime
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== FILE TREE (Combined) =====

app.get('/api/tree', async (req, res) => {
  try {
    const [allFolders, allFiles] = await Promise.all([
      folders.getAll(),
      files.getAll()
    ]);
    
    // Build tree structure
    const folderMap = {};
    const tree = [];
    
    allFolders.forEach(f => {
      folderMap[f.id] = { ...f, type: 'folder', children: [] };
    });
    
    allFolders.forEach(f => {
      if (f.parent_id && folderMap[f.parent_id]) {
        folderMap[f.parent_id].children.push(folderMap[f.id]);
      } else if (f.id !== 'root') {
        tree.push(folderMap[f.id]);
      }
    });
    
    // Add root if exists
    if (folderMap['root']) {
      tree.unshift(folderMap['root']);
    }
    
    allFiles.forEach(f => {
      const fileNode = { ...f, type: 'file' };
      if (f.folder_id && folderMap[f.folder_id]) {
        folderMap[f.folder_id].children.push(fileNode);
      } else {
        tree.push(fileNode);
      }
    });
    
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// Catch-all to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-client/index.html'));
});

// Language detection helper
function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const langMap = {
    '.js': 'javascript', '.ts': 'typescript', '.jsx': 'javascript',
    '.tsx': 'typescript', '.html': 'html', '.css': 'css',
    '.json': 'json', '.py': 'python', '.md': 'markdown',
    '.sql': 'sql', '.sh': 'shell'
  };
  return langMap[ext] || 'plaintext';
}

app.listen(PORT, () => {
  console.log(`🚀 JavaScript Code Editor v2.0 Server running on port ${PORT}`);
  console.log(`📁 SQLite database: ${path.join(__dirname, 'editor.db')}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

module.exports = app;