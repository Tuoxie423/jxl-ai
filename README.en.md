# JXL-AI

An engaging AI interactive web application featuring chat, image generation, quiz games, and more.

## Project Overview

JXL-AI is a Node.js-based interactive web application offering AI chatbot functionality, image recognition and generation, and interactive games. The project includes multiple modular pages that allow users to interact with AI characters and experience fun AI-powered features.

## Features

- **AI Chat** - Engage in real-time conversations with AI characters
- **Image Upload & Recognition** - Upload images and receive AI-powered analysis
- **Character Showcase** - View and manage different AI characters
- **Interactive Games** - Includes fun interactive games such as aiming games
- **QR Code Generation** - Generate QR codes for sharing or redirection

## Technology Stack

- Node.js backend
- Express.js web server
- SQLite database (data/app.db)
- Native HTML/CSS/JavaScript frontend

## Project Structure

```
├── server.mjs          # Node.js server entry point
├── package.json        # Project dependency configuration
├── data/
│   └── app.db          # SQLite database
└── public/
    ├── index.html      # Main page (games, generators, etc.)
    ├── chat.html       # AI chat page
    ├── intro.html      # Introduction page
    ├── bestiary.html   # Image upload / bestiary page
    └── assets/         # Static assets (image resources)
```

## Installation Instructions

1. Ensure Node.js (v14+) is installed
2. Install project dependencies:

```bash
npm install
```

3. Start the server:

```bash
node server.mjs
```

4. Open your browser and navigate to `http://localhost:3000`

## Page Descriptions

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Features games, generators, QR code tools, etc. |
| Chat | `/chat.html` | Interact with AI characters via chat |
| Introduction | `/intro.html` | Animated character introductions |
| Bestiary | `/bestiary.html` | Upload images and perform AI recognition |

## Configuration

- Default server port: `3000`
- Database file: `data/app.db`
- Upload directory: `public/uploads/`

## Dependencies

- express - Web framework
- multer - File upload handling
- better-sqlite3 - SQLite database
- qrcode - QR code generation
- uuid - Unique identifier generation

## License

MIT License

## Author

- GitHub: https://github.com/tuoxie423
- Gitee: https://gitee.com/tuoxie423