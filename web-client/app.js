// ==========================================
// JavaScript Code Editor v2.0 - Frontend App
// ==========================================

const API_BASE = ''; // Same origin

const app = {
  // State
  state: {
    folders: [],
    files: [],
    tree: [],
    openTabs: [],
    activeTabId: null,
    sidebarWidth: 260,
    bottomPanelHeight: 200,
    sidebarVisible: true,
    bottomPanelVisible: true,
    bottomPanelTab: 'console',
    consoleLogs: [],
    expandedFolders: new Set(['root']),
    contextMenuTarget: null,
    newItemType: null,
    newItemParentId: 'root',
    editor: null,
    isLoading: false,
    settings: {
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      tabSize: 2,
      minimap: true
    },
    searchQuery: '',
    commandPaletteOpen: false,
    settingsOpen: false
  },

  // Init
  async init() {
    this.loadSettings();
    this.setupResizers();
    this.setupKeyboardShortcuts();
    this.setupGlobalEvents();
    this.setupContextMenuClose();
    
    await this.loadTree();
    this.initMonaco();
    this.renderTabs();
    this.updateFileCount();
    
    this.showToast('Welcome to JavaScript Code Editor v2.0', 'info');
  },

  // Settings
  loadSettings() {
    try {
      const saved = localStorage.getItem('jseditor_settings');
      if (saved) this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
    } catch (e) {}
  },

  saveSettings() {
    localStorage.setItem('jseditor_settings', JSON.stringify(this.state.settings));
  },

  updateSetting(key, value) {
    this.state.settings[key] = value;
    this.saveSettings();
    this.applyEditorSettings();
    
    if (key === 'theme') {
      document.documentElement.classList.toggle('dark', value === 'vs-dark' || value === 'hc-black');
    }
  },

  toggleSetting(key) {
    this.state.settings[key] = !this.state.settings[key];
    this.saveSettings();
    this.applyEditorSettings();
    this.renderSettingsUI();
  },

  applyEditorSettings() {
    if (!this.state.editor) return;
    const s = this.state.settings;
    this.state.editor.updateOptions({
      fontSize: s.fontSize,
      wordWrap: s.wordWrap,
      tabSize: s.tabSize,
      minimap: { enabled: s.minimap },
      theme: s.theme
    });
  },

  renderSettingsUI() {
    const s = this.state.settings;
    document.getElementById('setting-theme').value = s.theme;
    document.getElementById('setting-fontSize').value = s.fontSize;
    document.getElementById('setting-wordWrap').value = s.wordWrap;
    document.getElementById('setting-tabSize').value = s.tabSize;
    
    const minimapToggle = document.getElementById('setting-minimap-toggle');
    const minimapDot = minimapToggle.querySelector('span');
    if (s.minimap) {
      minimapToggle.classList.add('bg-editor-accent');
      minimapToggle.classList.remove('bg-editor-border');
      minimapDot.classList.add('translate-x-6');
      minimapDot.classList.remove('translate-x-1');
    } else {
      minimapToggle.classList.remove('bg-editor-accent');
      minimapToggle.classList.add('bg-editor-border');
      minimapDot.classList.remove('translate-x-6');
      minimapDot.classList.add('translate-x-1');
    }
  },

  // Monaco Editor
  initMonaco() {
    require.config({ 
      paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }
    });

    require(['vs/editor/editor.main'], () => {
      const container = document.getElementById('monaco-editor');
      
      this.state.editor = monaco.editor.create(container, {
        value: '',
        language: 'javascript',
        theme: this.state.settings.theme,
        fontSize: this.state.settings.fontSize,
        wordWrap: this.state.settings.wordWrap,
        tabSize: this.state.settings.tabSize,
        minimap: { enabled: this.state.settings.minimap },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        roundedSelection: false,
        padding: { top: 16 },
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        contextmenu: false, // We use custom
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        formatOnPaste: true,
        formatOnType: true,
        dragAndDrop: true,
        links: true,
        colorDecorators: true,
        bracketPairColorization: { enabled: true }
      });

      // Custom context menu
      this.state.editor.onContextMenu((e) => {
        e.event.preventDefault();
        this.showContextMenu(e.event.browserEvent, 'editor');
      });

      // Content change tracking
      this.state.editor.onDidChangeModelContent(() => {
        this.markActiveTabModified(true);
      });

      // Apply dark class to html
      document.documentElement.classList.toggle('dark', this.state.settings.theme !== 'vs');
    });
  },

  // Data Loading
  async loadTree() {
    try {
      const res = await fetch(`${API_BASE}/api/tree`);
      const data = await res.json();
      if (data.success) {
        this.state.tree = data.data;
        this.renderFileTree();
      }
    } catch (err) {
      this.showToast('Failed to load file tree', 'error');
    }
  },

  async loadFiles() {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        fetch(`${API_BASE}/api/folders`),
        fetch(`${API_BASE}/api/files`)
      ]);
      const foldersData = await foldersRes.json();
      const filesData = await filesRes.json();
      
      if (foldersData.success) this.state.folders = foldersData.data;
      if (filesData.success) this.state.files = filesData.data;
      
      this.updateFileCount();
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  },

  // File Tree Rendering
  renderFileTree() {
    const container = document.getElementById('file-tree');
    const filtered = this.filterTree(this.state.tree, this.state.searchQuery);
    container.innerHTML = this.renderTreeNodes(filtered, 0);
    this.updateFileCount();
  },

  filterTree(nodes, query) {
    if (!query) return nodes;
    const lowerQ = query.toLowerCase();
    
    return nodes.map(node => {
      const matches = node.name.toLowerCase().includes(lowerQ);
      let filteredChildren = [];
      
      if (node.children) {
        filteredChildren = this.filterTree(node.children, query);
      }
      
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(Boolean);
  },

  renderTreeNodes(nodes, depth) {
    if (!nodes || nodes.length === 0) return '';
    
    return nodes.map(node => {
      const isFolder = node.type === 'folder';
      const isExpanded = this.state.expandedFolders.has(node.id);
      const paddingLeft = depth * 12 + 8;
      const isActive = this.state.activeTabId === node.id;
      
      if (isFolder) {
        const hasChildren = node.children && node.children.length > 0;
        return `
          <div class="select-none">
            <div onclick="app.toggleFolder('${node.id}')" 
                 oncontextmenu="app.showContextMenu(event, 'folder', '${node.id}')"
                 class="flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-editor-active text-white' : 'text-editor-muted hover:text-white hover:bg-editor-hover'}"
                 style="padding-left: ${paddingLeft}px">
              <svg class="w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${hasChildren ? '' : 'opacity-0'}" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
              <svg class="w-4 h-4 ${isExpanded ? 'text-yellow-400' : 'text-yellow-500/70'}" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span class="text-xs truncate">${this.escapeHtml(node.name)}</span>
            </div>
            ${isExpanded ? `<div class="animate-slide-in">${this.renderTreeNodes(node.children, depth + 1)}</div>` : ''}
          </div>
        `;
      } else {
        const langIcon = this.getFileIcon(node.name);
        const isModified = this.isTabModified(node.id);
        
        return `
          <div onclick="app.openFile('${node.id}')" 
               oncontextmenu="app.showContextMenu(event, 'file', '${node.id}')"
               class="flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-editor-active text-white' : 'text-editor-muted hover:text-white hover:bg-editor-hover'}"
               style="padding-left: ${paddingLeft + 20}px">
            <span class="text-sm">${langIcon}</span>
            <span class="text-xs truncate flex-1">${this.escapeHtml(node.name)}${isModified ? '<span class="text-editor-accent ml-1">●</span>' : ''}</span>
          </div>
        `;
      }
    }).join('');
  },

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      js: '📜', ts: '🔷', jsx: '⚛️', tsx: '⚛️',
      html: '🌐', css: '🎨', json: '📋',
      py: '🐍', md: '📝', sql: '🗄️',
      txt: '📄'
    };
    return icons[ext] || '📄';
  },

  toggleFolder(id) {
    if (this.state.expandedFolders.has(id)) {
      this.state.expandedFolders.delete(id);
    } else {
      this.state.expandedFolders.add(id);
    }
    this.renderFileTree();
  },

  collapseAllFolders() {
    this.state.expandedFolders.clear();
    this.state.expandedFolders.add('root');
    this.renderFileTree();
  },

  searchFiles(query) {
    this.state.searchQuery = query;
    this.renderFileTree();
  },

  // Tab Management
  openFile(id) {
    // Check if already open
    const existingTab = this.state.openTabs.find(t => t.id === id);
    if (existingTab) {
      this.switchToTab(id);
      return;
    }

    // Find file in tree
    const file = this.findNodeInTree(this.state.tree, id);
    if (!file || file.type !== 'file') return;

    const tab = {
      id: file.id,
      name: file.name,
      content: file.content || '',
      language: file.language || 'javascript',
      folder_id: file.folder_id,
      modified: false,
      originalContent: file.content || ''
    };

    this.state.openTabs.push(tab);
    this.switchToTab(id);
    this.renderTabs();
    
    // Hide empty state
    document.getElementById('empty-state').classList.add('hidden');
  },

  findNodeInTree(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  switchToTab(id) {
    // Save current content before switching
    if (this.state.activeTabId && this.state.editor) {
      const currentTab = this.state.openTabs.find(t => t.id === this.state.activeTabId);
      if (currentTab) {
        currentTab.content = this.state.editor.getValue();
      }
    }

    this.state.activeTabId = id;
    const tab = this.state.openTabs.find(t => t.id === id);
    
    if (tab && this.state.editor) {
      this.state.editor.setValue(tab.content);
      monaco.editor.setModelLanguage(this.state.editor.getModel(), tab.language);
      this.state.editor.focus();
    }
    
    this.renderTabs();
    this.updateBreadcrumbs();
  },

  closeTab(id, event) {
    if (event) event.stopPropagation();
    
    const tabIndex = this.state.openTabs.findIndex(t => t.id === id);
    if (tabIndex === -1) return;
    
    const tab = this.state.openTabs[tabIndex];
    
    // Check unsaved
    if (tab.modified) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
    }
    
    this.state.openTabs.splice(tabIndex, 1);
    
    if (this.state.activeTabId === id) {
      if (this.state.openTabs.length > 0) {
        const newIndex = Math.min(tabIndex, this.state.openTabs.length - 1);
        this.switchToTab(this.state.openTabs[newIndex].id);
      } else {
        this.state.activeTabId = null;
        if (this.state.editor) this.state.editor.setValue('');
        document.getElementById('empty-state').classList.remove('hidden');
      }
    }
    
    this.renderTabs();
    this.updateBreadcrumbs();
  },

  markActiveTabModified(modified) {
    if (!this.state.activeTabId) return;
    const tab = this.state.openTabs.find(t => t.id === this.state.activeTabId);
    if (tab) {
      tab.modified = modified;
      this.renderTabs();
      this.renderFileTree(); // Update dot indicator
    }
  },

  isTabModified(id) {
    const tab = this.state.openTabs.find(t => t.id === id);
    return tab ? tab.modified : false;
  },

  renderTabs() {
    const container = document.getElementById('tabs-bar');
    if (this.state.openTabs.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.state.openTabs.map(tab => {
      const isActive = tab.id === this.state.activeTabId;
      return `
        <div onclick="app.switchToTab('${tab.id}')" 
             class="tab group flex items-center gap-2 px-3 py-2.5 min-w-[120px] max-w-[200px] cursor-pointer border-r border-editor-border transition-all ${isActive ? 'bg-editor-bg text-white border-t-2 border-t-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-white hover:bg-editor-hover border-t-2 border-t-transparent'}">
          <span class="text-sm">${this.getFileIcon(tab.name)}</span>
          <span class="text-xs truncate flex-1">${this.escapeHtml(tab.name)}${tab.modified ? '<span class="text-editor-accent ml-1">●</span>' : ''}</span>
          <button onclick="app.closeTab('${tab.id}', event)" 
                  class="tab-close p-0.5 rounded-md hover:bg-editor-hover text-editor-muted hover:text-white transition-all">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      `;
    }).join('');
  },

  updateBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!this.state.activeTabId) {
      container.innerHTML = '<span class="text-white font-medium">Project</span>';
      return;
    }
    
    const tab = this.state.openTabs.find(t => t.id === this.state.activeTabId);
    if (!tab) return;
    
    // Find folder path
    let folderName = 'Project';
    const folder = this.state.folders.find(f => f.id === tab.folder_id);
    if (folder) folderName = folder.name;
    
    container.innerHTML = `
      <span class="hover:text-white cursor-pointer transition-colors" onclick="app.collapseAllFolders(); app.toggleFolder('root')">${this.escapeHtml(folderName)}</span>
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      <span class="text-white font-medium truncate">${this.escapeHtml(tab.name)}</span>
    `;
  },

  // File Operations
  async saveActiveFile() {
    if (!this.state.activeTabId) return;
    
    const tab = this.state.openTabs.find(t => t.id === this.state.activeTabId);
    if (!tab) return;
    
    const content = this.state.editor.getValue();
    
    try {
      const res = await fetch(`${API_BASE}/api/files/${tab.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, name: tab.name })
      });
      
      const data = await res.json();
      if (data.success) {
        tab.originalContent = content;
        tab.modified = false;
        tab.content = content;
        this.renderTabs();
        this.renderFileTree();
        this.showToast(`Saved ${tab.name}`, 'success');
        
        // Refresh tree to sync
        await this.loadTree();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      this.showToast(`Failed to save: ${err.message}`, 'error');
    }
  },

  async createFile(name, folderId = 'root') {
    try {
      const res = await fetch(`${API_BASE}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, folder_id: folderId, content: '' })
      });
      
      const data = await res.json();
      if (data.success) {
        await this.loadTree();
        this.openFile(data.data.id);
        this.showToast(`Created ${name}`, 'success');
        this.expandFolder(folderId);
      }
    } catch (err) {
      this.showToast(`Failed to create file: ${err.message}`, 'error');
    }
  },

  async createFolder(name, parentId = 'root') {
    try {
      const res = await fetch(`${API_BASE}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: parentId })
      });
      
      const data = await res.json();
      if (data.success) {
        await this.loadTree();
        this.showToast(`Created folder ${name}`, 'success');
        this.expandFolder(parentId);
      }
    } catch (err) {
      this.showToast(`Failed to create folder: ${err.message}`, 'error');
    }
  },

  async deleteFile(id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/files/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        // Close tab if open
        const tabIndex = this.state.openTabs.findIndex(t => t.id === id);
        if (tabIndex !== -1) this.closeTab(id);
        
        await this.loadTree();
        this.showToast('File deleted', 'success');
      }
    } catch (err) {
      this.showToast(`Failed to delete: ${err.message}`, 'error');
    }
  },

  async deleteFolder(id) {
    if (id === 'root') {
      this.showToast('Cannot delete root folder', 'error');
      return;
    }
    if (!confirm('Delete this folder and all its contents?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/folders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        // Close any open tabs in this folder
        const folder = this.findNodeInTree(this.state.tree, id);
        if (folder) {
          const filesToClose = this.getAllFileIds(folder);
          filesToClose.forEach(fid => {
            if (this.state.openTabs.find(t => t.id === fid)) this.closeTab(fid);
          });
        }
        
        await this.loadTree();
        this.showToast('Folder deleted', 'success');
      }
    } catch (err) {
      this.showToast(`Failed to delete: ${err.message}`, 'error');
    }
  },

  getAllFileIds(node) {
    let ids = [];
    if (node.type === 'file') ids.push(node.id);
    if (node.children) {
      node.children.forEach(child => {
        ids = ids.concat(this.getAllFileIds(child));
      });
    }
    return ids;
  },

  expandFolder(id) {
    this.state.expandedFolders.add(id);
    this.renderFileTree();
  },

  async renameItem(type, id) {
    const node = this.findNodeInTree(this.state.tree, id);
    if (!node) return;
    
    const newName = prompt(`Rename ${type}:`, node.name);
    if (!newName || newName === node.name) return;
    
    try {
      const endpoint = type === 'folder' ? `/api/folders/${id}` : `/api/files/${id}`;
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      const data = await res.json();
      if (data.success) {
        // Update tab name if file is open
        if (type === 'file') {
          const tab = this.state.openTabs.find(t => t.id === id);
          if (tab) tab.name = newName;
        }
        await this.loadTree();
        this.renderTabs();
        this.showToast('Renamed successfully', 'success');
      }
    } catch (err) {
      this.showToast(`Failed to rename: ${err.message}`, 'error');
    }
  },

  // Code Execution
  async runCode() {
    if (!this.state.activeTabId) {
      this.showToast('Open a file first', 'warning');
      return;
    }
    
    const code = this.state.editor.getValue();
    if (!code.trim()) {
      this.showToast('Nothing to execute', 'warning');
      return;
    }
    
    // Auto-save before run
    await this.saveActiveFile();
    
    const runBtn = document.getElementById('run-btn');
    const originalContent = runBtn.innerHTML;
    runBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Running...</span>`;
    runBtn.disabled = true;
    
    this.switchBottomTab('console');
    this.addConsoleLog('Running...', 'info');
    
    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      
      // Remove "Running..." log
      this.state.consoleLogs.pop();
      
      if (data.output) {
        this.addConsoleLog(data.output, 'output');
      }
      if (data.error) {
        this.addConsoleLog(data.error, 'error');
      }
      
      this.addConsoleLog(`Executed in ${data.executionTime || 0}ms`, 'info');
      
      if (data.success) {
        this.showToast('Execution completed', 'success');
      } else {
        this.showToast('Execution failed', 'error');
      }
    } catch (err) {
      this.state.consoleLogs.pop();
      this.addConsoleLog(`Network error: ${err.message}`, 'error');
      this.showToast('Execution failed', 'error');
    } finally {
      runBtn.innerHTML = originalContent;
      runBtn.disabled = false;
    }
  },

  addConsoleLog(message, type = 'output') {
    const timestamp = new Date().toLocaleTimeString();
    this.state.consoleLogs.push({ message, type, timestamp });
    this.renderConsole();
  },

  clearConsole() {
    this.state.consoleLogs = [];
    this.renderConsole();
  },

  renderConsole() {
    const container = document.getElementById('console-content');
    if (this.state.consoleLogs.length === 0) {
      container.innerHTML = '<div class="text-editor-muted italic">Ready to execute. Press Ctrl+Enter to run code.</div>';
      return;
    }
    
    container.innerHTML = this.state.consoleLogs.map(log => {
      const colors = {
        output: 'text-green-400',
        error: 'text-red-400',
        info: 'text-blue-400',
        warning: 'text-yellow-400'
      };
      
      const icons = {
        output: '>',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
      };
      
      return `
        <div class="flex gap-2 animate-slide-in">
          <span class="text-editor-muted select-none">[${log.timestamp}]</span>
          <span class="${colors[log.type] || 'text-white'} select-none">${icons[log.type] || '>'}</span>
          <pre class="whitespace-pre-wrap break-all ${colors[log.type] || 'text-white'} flex-1">${this.escapeHtml(log.message)}</pre>
        </div>
      `;
    }).join('');
    
    // Auto-scroll
    const panel = container.parentElement;
    panel.scrollTop = panel.scrollHeight;
  },

  switchBottomTab(tab) {
    this.state.bottomPanelTab = tab;
    document.getElementById('tab-console').className = `px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'console' ? 'text-white border-editor-accent bg-editor-panel/50' : 'text-editor-muted hover:text-white border-transparent'}`;
    document.getElementById('tab-problems').className = `px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'problems' ? 'text-white border-editor-accent bg-editor-panel/50' : 'text-editor-muted hover:text-white border-transparent'}`;
    
    document.getElementById('console-content').classList.toggle('hidden', tab !== 'console');
    document.getElementById('problems-content').classList.toggle('hidden', tab !== 'problems');
  },

  // UI Toggles
  toggleSidebar() {
    this.state.sidebarVisible = !this.state.sidebarVisible;
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    
    if (this.state.sidebarVisible) {
      sidebar.style.width = `${this.state.sidebarWidth}px`;
      sidebar.style.marginLeft = '0';
      resizer.style.display = 'block';
    } else {
      sidebar.style.width = '0px';
      sidebar.style.marginLeft = '-4px';
      resizer.style.display = 'none';
    }
  },

  toggleBottomPanel() {
    this.state.bottomPanelVisible = !this.state.bottomPanelVisible;
    const panel = document.getElementById('bottom-panel');
    const resizer = document.getElementById('bottom-resizer');
    
    if (this.state.bottomPanelVisible) {
      panel.style.height = `${this.state.bottomPanelHeight}px`;
      panel.style.display = 'flex';
      resizer.style.display = 'block';
    } else {
      panel.style.height = '0px';
      panel.style.display = 'none';
      resizer.style.display = 'none';
    }
  },

  // Modals
  showNewItemModal(type, parentId = 'root') {
    this.state.newItemType = type;
    this.state.newItemParentId = parentId;
    document.getElementById('new-item-title').textContent = type === 'folder' ? 'New Folder' : 'New File';
    document.getElementById('new-item-modal').classList.remove('hidden');
    document.getElementById('new-item-input').value = '';
    document.getElementById('new-item-input').focus();
  },

  closeNewItemModal() {
    document.getElementById('new-item-modal').classList.add('hidden');
    this.state.newItemType = null;
  },

  async confirmNewItem() {
    const name = document.getElementById('new-item-input').value.trim();
    if (!name) return;
    
    if (this.state.newItemType === 'file') {
      await this.createFile(name, this.state.newItemParentId);
    } else {
      await this.createFolder(name, this.state.newItemParentId);
    }
    
    this.closeNewItemModal();
  },

  toggleSettings() {
    this.state.settingsOpen = !this.state.settingsOpen;
    const modal = document.getElementById('settings-modal');
    if (this.state.settingsOpen) {
      modal.classList.remove('hidden');
      this.renderSettingsUI();
    } else {
      modal.classList.add('hidden');
    }
  },

  closeSettings() {
    this.state.settingsOpen = false;
    document.getElementById('settings-modal').classList.add('hidden');
  },

  // Command Palette
  showCommandPalette() {
    this.state.commandPaletteOpen = true;
    document.getElementById('command-palette').classList.remove('hidden');
    document.getElementById('cmd-input').value = '';
    document.getElementById('cmd-input').focus();
    this.renderCommandPalette('');
  },

  closeCommandPalette() {
    this.state.commandPaletteOpen = false;
    document.getElementById('command-palette').classList.add('hidden');
  },

  renderCommandPalette(query) {
    const container = document.getElementById('cmd-results');
    const lowerQ = query.toLowerCase();
    
    const commands = [
      { id: 'new-file', label: 'New File', icon: '📄', action: () => this.showNewItemModal('file') },
      { id: 'new-folder', label: 'New Folder', icon: '📁', action: () => this.showNewItemModal('folder') },
      { id: 'save', label: 'Save File', icon: '💾', action: () => this.saveActiveFile() },
      { id: 'run', label: 'Run Code', icon: '▶️', action: () => this.runCode() },
      { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: '◫', action: () => this.toggleSidebar() },
      { id: 'toggle-panel', label: 'Toggle Bottom Panel', icon: '▤', action: () => this.toggleBottomPanel() },
      { id: 'settings', label: 'Open Settings', icon: '⚙️', action: () => this.toggleSettings() },
      { id: 'collapse-all', label: 'Collapse All Folders', icon: '⤊', action: () => this.collapseAllFolders() },
    ];
    
    // Add open files
    const fileCommands = this.state.openTabs.map(tab => ({
      id: `tab-${tab.id}`,
      label: `Open: ${tab.name}`,
      icon: this.getFileIcon(tab.name),
      action: () => this.switchToTab(tab.id)
    }));
    
    // Add all files from tree
    const allFiles = this.flattenTree(this.state.tree).filter(n => n.type === 'file');
    const treeFileCommands = allFiles
      .filter(f => !this.state.openTabs.find(t => t.id === f.id))
      .map(f => ({
        id: `file-${f.id}`,
        label: `File: ${f.name}`,
        icon: this.getFileIcon(f.name),
        action: () => this.openFile(f.id)
      }));
    
    const allCommands = [...commands, ...fileCommands, ...treeFileCommands];
    const filtered = lowerQ ? allCommands.filter(c => c.label.toLowerCase().includes(lowerQ)) : allCommands;
    
    container.innerHTML = filtered.map((cmd, index) => `
      <div onclick="app.executeCommand('${cmd.id}')" 
           class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-editor-hover transition-colors ${index === 0 ? 'bg-editor-hover/50' : ''}"
           data-cmd-id="${cmd.id}">
        <span class="text-base">${cmd.icon}</span>
        <span class="text-sm text-white">${this.escapeHtml(cmd.label)}</span>
      </div>
    `).join('');
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="px-4 py-3 text-sm text-editor-muted italic">No results found</div>';
    }
  },

  executeCommand(id) {
    const commands = [
      { id: 'new-file', action: () => this.showNewItemModal('file') },
      { id: 'new-folder', action: () => this.showNewItemModal('folder') },
      { id: 'save', action: () => this.saveActiveFile() },
      { id: 'run', action: () => this.runCode() },
      { id: 'toggle-sidebar', action: () => this.toggleSidebar() },
      { id: 'toggle-panel', action: () => this.toggleBottomPanel() },
      { id: 'settings', action: () => this.toggleSettings() },
      { id: 'collapse-all', action: () => this.collapseAllFolders() },
      ...this.state.openTabs.map(tab => ({ id: `tab-${tab.id}`, action: () => this.switchToTab(tab.id) })),
      ...this.flattenTree(this.state.tree)
        .filter(n => n.type === 'file')
        .map(f => ({ id: `file-${f.id}`, action: () => this.openFile(f.id) }))
    ];
    
    const cmd = commands.find(c => c.id === id);
    if (cmd) {
      cmd.action();
      this.closeCommandPalette();
    }
  },

  flattenTree(nodes) {
    let result = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children) {
        result = result.concat(this.flattenTree(node.children));
      }
    });
    return result;
  },

  // Context Menu
  showContextMenu(event, type, id = null) {
    event.preventDefault();
    event.stopPropagation();
    
    this.state.contextMenuTarget = { type, id };
    const menu = document.getElementById('context-menu');
    
    let items = [];
    if (type === 'folder') {
      items = [
        { label: 'New File', action: () => this.showNewItemModal('file', id), icon: '📄' },
        { label: 'New Folder', action: () => this.showNewItemModal('folder', id), icon: '📁' },
        { separator: true },
        { label: 'Rename', action: () => this.renameItem('folder', id), icon: '✏️' },
        { label: 'Delete', action: () => this.deleteFolder(id), icon: '🗑️', danger: true }
      ];
    } else if (type === 'file') {
      items = [
        { label: 'Open', action: () => this.openFile(id), icon: '👁️' },
        { separator: true },
        { label: 'Rename', action: () => this.renameItem('file', id), icon: '✏️' },
        { label: 'Delete', action: () => this.deleteFile(id), icon: '🗑️', danger: true }
      ];
    } else if (type === 'editor') {
      items = [
        { label: 'Cut', action: () => this.state.editor.focus(), icon: '✂️' },
        { label: 'Copy', action: () => document.execCommand('copy'), icon: '📋' },
        { label: 'Paste', action: () => document.execCommand('paste'), icon: '📄' },
        { separator: true },
        { label: 'Format Document', action: () => this.state.editor.getAction('editor.action.formatDocument').run(), icon: '✨' }
      ];
    }
    
    menu.innerHTML = items.map(item => {
      if (item.separator) return '<div class="my-1 border-t border-editor-border"></div>';
      return `
        <div onclick="app.executeContextAction(() => { ${item.action.toString().replace(/.*\{([\s\S]*)\}$/, '$1')} })" 
             class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-editor-hover transition-colors ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-editor-text'}">
          <span>${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `;
    }).join('');
    
    // Position
    const x = Math.min(event.clientX, window.innerWidth - 170);
    const y = Math.min(event.clientY, window.innerHeight - items.length * 36);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
  },

  executeContextAction(actionFn) {
    this.hideContextMenu();
    // Small delay to let menu close
    setTimeout(() => actionFn(), 10);
  },

  hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
    this.state.contextMenuTarget = null;
  },

  setupContextMenuClose() {
    document.addEventListener('click', () => this.hideContextMenu());
    document.addEventListener('scroll', () => this.hideContextMenu(), true);
  },

  // Resizers
  setupResizers() {
    // Sidebar resizer
    const sidebarResizer = document.getElementById('sidebar-resizer');
    let isResizingSidebar = false;
    
    sidebarResizer.addEventListener('mousedown', (e) => {
      isResizingSidebar = true;
      sidebarResizer.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    
    // Bottom panel resizer
    const bottomResizer = document.getElementById('bottom-resizer');
    let isResizingBottom = false;
    
    bottomResizer.addEventListener('mousedown', (e) => {
      isResizingBottom = true;
      bottomResizer.classList.add('active');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(180, Math.min(500, e.clientX));
        this.state.sidebarWidth = newWidth;
        document.getElementById('sidebar').style.width = `${newWidth}px`;
      }
      if (isResizingBottom) {
        const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, window.innerHeight - e.clientY));
        this.state.bottomPanelHeight = newHeight;
        document.getElementById('bottom-panel').style.height = `${newHeight}px`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      isResizingSidebar = false;
      isResizingBottom = false;
      sidebarResizer.classList.remove('active');
      bottomResizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  },

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Command Palette: Ctrl+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        if (this.state.commandPaletteOpen) this.closeCommandPalette();
        else this.showCommandPalette();
      }
      
      // Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveActiveFile();
      }
      
      // Run: Ctrl+Enter
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.runCode();
      }
      
      // Close Tab: Ctrl+W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (this.state.activeTabId) this.closeTab(this.state.activeTabId);
      }
      
      // New File: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showNewItemModal('file');
      }
      
      // Escape
      if (e.key === 'Escape') {
        this.closeCommandPalette();
        this.closeSettings();
        this.closeNewItemModal();
        this.hideContextMenu();
      }
      
      // Command palette navigation
      if (this.state.commandPaletteOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          // Simple implementation - could be enhanced
        }
      }
    });
  },

  setupGlobalEvents() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.state.editor) this.state.editor.layout();
    });
    
    // Command palette input
    document.getElementById('cmd-input').addEventListener('input', (e) => {
      this.renderCommandPalette(e.target.value);
    });
    
    // New item modal input
    document.getElementById('new-item-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmNewItem();
      if (e.key === 'Escape') this.closeNewItemModal();
    });
  },

  // Utilities
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const id = Date.now();
    
    const colors = {
      success: 'bg-green-500/10 border-green-500/30 text-green-400',
      error: 'bg-red-500/10 border-red-500/30 text-red-400',
      warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      info: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    };
    
    const icons = {
      success: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
      error: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
      warning: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
      info: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };
    
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-slide-in ${colors[type] || colors.info}`;
    toast.innerHTML = `${icons[type] || icons.info}<span class="text-sm font-medium">${this.escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  updateFileCount() {
    const count = this.state.files.length;
    document.getElementById('file-count').textContent = `${count} file${count !== 1 ? 's' : ''}`;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Start app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});