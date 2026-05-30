# JavaScript Code Editor v1.1.0

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/sqlite-3.40%2B-orange.svg" alt="SQLite">
</p>

<p align="center">
  <b>A modern, full-stack web-based code editor with persistent SQLite-backed file storage, Monaco Editor integration, and secure server-side code execution.</b>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## ✨ Features

### Core Editing
- **Monaco Editor** — The same editor engine that powers VS Code, featuring:
  - Syntax highlighting for JavaScript, TypeScript, HTML, CSS, JSON, Python, and more
  - IntelliSense & auto-completion
  - Bracket pair colorization
  - Code folding & minimap
  - Find & replace with regex support
  - Multi-cursor editing
  - Smooth cursor animations

### File Management
- **SQLite3 Database** — Persistent storage for folders and files
- **Hierarchical File Explorer** — Nested folders with expand/collapse
- **Multi-Tab Interface** — Work on multiple files simultaneously
- **Unsaved Change Indicators** — Visual dots on modified tabs and tree items
- **Quick File Search** — Filter files in real-time within the sidebar
- **Command Palette** (`Ctrl+P`) — Keyboard-driven file navigation and commands

### UI/UX
- **Tailwind CSS** — Modern, responsive dark-first design system
- **Resizable Panels** — Drag-to-resize sidebar and bottom console panel
- **Custom Context Menus** — Right-click actions on files, folders, and editor
- **Toast Notifications** — Non-intrusive success, error, and info messages
- **Breadcrumb Navigation** — Current file path context in the header
- **Settings Modal** — Persistent editor preferences via localStorage:
  - Theme switching (Dark / Light / High Contrast)
  - Font size, tab size, word wrap
  - Minimap toggle

### Execution & Console
- **Secure Server-Side Execution** — Node.js `child_process` with:
  - 5-second execution timeout
  - Isolated temporary file cleanup
  - Execution time metrics
- **Rich Console Output** — Color-coded logs (info, output, error, warning)
- **Problem Detection** — Dedicated problems panel for runtime errors

### Responsive Design
- **Mobile-Ready** — Collapsible sidebar, touch-optimized controls
- **Adaptive Toolbar** — Contextual buttons based on viewport size
- **Keyboard-First** — Full shortcut coverage for power users

---

## 🏗 Architecture

```
javascript-code-editor/
├── package.json                 # Root workspace configuration
├── README.md                    # This file
│
├── server/
│   ├── package.json             # Server dependencies (Express, SQLite3, CORS)
│   ├── server.js                # Express API & static file server
│   └── db.js                    # SQLite schema, CRUD helpers, seed data
│
└── web-client/
    ├── index.html               # Single-page app shell + Tailwind CDN
    ├── app.js                   # ~700 lines of vanilla JS application logic
    └── styles.css               # Custom scrollbar, animations, responsive overrides
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla JS + Tailwind CSS CDN | Zero-build, lightweight SPA |
| **Editor** | Monaco Editor (CDN) | VS Code-grade editing experience |
| **Backend** | Node.js + Express | REST API & static asset serving |
| **Database** | SQLite3 | Zero-config, file-based relational storage |
| **Execution** | Node.js `child_process` | Sandboxed code evaluation |

### Database Schema

```sql
folders
├── id (TEXT PK)
├── name (TEXT)
├── parent_id (TEXT FK → folders.id)
├── created_at (DATETIME)
└── updated_at (DATETIME)

files
├── id (TEXT PK)
├── name (TEXT)
├── folder_id (TEXT FK → folders.id)
├── content (TEXT)
├── language (TEXT)
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/joemrnice/javascript-code-editor.git
cd javascript-code-editor

# Install all dependencies (root + server)
npm run install:all
```

### Running the Application

```bash
# Development mode (auto-restart on file changes)
cd server && npm run dev

# Production mode
cd server && npm start
```

The server will start on **http://localhost:3001** and automatically serve the frontend.

> **Note:** The server handles both the REST API (`/api/*`) and static frontend files. No separate frontend dev server is required.

### First Run

On first startup, the SQLite database (`server/editor.db`) is automatically created with:
- A root folder named **"Project"**
- A sample `welcome.js` file demonstrating editor capabilities

---

## 📡 API Reference

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | List all folders |
| `POST` | `/api/folders` | Create folder `{ name, parent_id }` |
| `PUT` | `/api/folders/:id` | Rename folder `{ name }` |
| `DELETE` | `/api/folders/:id` | Delete folder (cascades to files) |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files` | List all files |
| `GET` | `/api/files/:id` | Get single file content |
| `POST` | `/api/files` | Create file `{ name, folder_id, content, language }` |
| `PUT` | `/api/files/:id` | Update file `{ name, content, language, folder_id }` |
| `DELETE` | `/api/files/:id` | Delete file |
| `GET` | `/api/search?q=term` | Search files by name or content |

### Execution

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/execute` | `{ code: "console.log(1+1)" }` | `{ success, output, error, executionTime }` |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tree` | Hierarchical folder + file tree for explorer |
| `GET` | `/api/health` | Server health check |

---

## ⌨ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + P` | Open Command Palette |
| `Ctrl + N` | Create New File |
| `Ctrl + S` | Save Active File |
| `Ctrl + Enter` | Run Code |
| `Ctrl + W` | Close Active Tab |
| `Esc` | Close Modals / Context Menu |

---

## 🎨 Customization

### Editor Settings

Click the **gear icon** in the top-right toolbar to open Settings:

- **Theme**: `vs-dark` (default), `vs` (light), `hc-black`
- **Font Size**: 8px – 32px
- **Word Wrap**: On / Off
- **Tab Size**: 2, 4, or 8 spaces
- **Minimap**: Show / Hide code overview

Settings are persisted to `localStorage` and survive page reloads.

### Adding Language Support

The editor auto-detects languages from file extensions. To add more:

1. Edit `server/server.js` → `detectLanguage()` map
2. Monaco Editor supports 50+ languages out of the box via CDN

---

## 🛡 Security Considerations

- **Execution Timeout**: All code runs with a 5-second hard limit to prevent infinite loops
- **Process Isolation**: Each execution spawns a fresh Node.js process
- **Temp File Cleanup**: Generated `.js` files are deleted immediately after execution
- **Input Validation**: All API endpoints validate required fields
- **CORS**: Enabled for development; configure origin restrictions for production

> **Warning:** This editor executes arbitrary JavaScript server-side. Deploy only in trusted environments or containerize with strict resource limits.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Frontend**: Pure vanilla JS — no build step required. Edit `web-client/app.js` directly.
- **Backend**: Follow existing Express route patterns. Update `db.js` for schema changes.
- **Styling**: Use Tailwind utility classes. Add custom CSS to `styles.css` only when necessary.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Microsoft's browser-based code editor
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [SQLite3](https://www.sqlite.org/index.html) — Embedded relational database
- [Express.js](https://expressjs.com/) — Fast, unopinionated web framework

---

<p align="center">
  <sub>Built with ❤️ by the open-source community.</sub>
</p>
