# JavaScript Code Editor 

 ![JavaScript Code Editor Screenshot](./images/javascripteditor.png)

---

A modern, full-stack web application for writing, compiling, and running JavaScript code directly in your browser. Built with React, Express, and Node.js.

## 🚀 Features

- Syntax-highlighted JavaScript code editor (powered by Monaco/React)
- Real-time code compilation and output
- Error and runtime feedback
- Responsive, dynamic UI
- Secure backend code execution

## ✅ Why use Monaco ?

- It’s the same editor used in VS Code

#### Supports: 

- Syntax highlighting

- Error checking

- Autocompletion (some)

- Themes (dark/light)

- Language-specific behaviors (JavaScript, in our case)

## 🖥️ Preview

![JavaScript Code Editor UI](./images/javascripteditor.png)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16+) 

### Installation

```bash
# Clone the repository
$ git clone https://github.com/joemrnice/javascript-code-editor.git
$ cd c-code-editor

# Install server dependencies
$ cd server && npm install

# Install client dependencies
$ cd ../web-client && npm install
```

### Running the Application

```bash
# Start the backend server
$ cd server && npm run dev

# In a new terminal, start the frontend
$ cd ../web-client && npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to use the editor.

---

## 📁 Project Structure

```
javascript-code-editor/
├── server/         # Express backend for JavaScript code execution
│   ├── app.js
│   ├── routes/
│   └── utils/
└── web-client/     # React frontend
    ├── src/
    └── public/
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Unofficial_JavaScript_logo_2.svg/512px-Unofficial_JavaScript_logo_2.svg.png?20141107110902"/>
</p>
