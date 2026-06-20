import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import OpenAI from "openai";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const uploadsDir = path.join(publicDir, "uploads");
const dbPath = path.join(dataDir, "app.db");
const port = Number(process.env.PORT || 5178);

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadsDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    name TEXT PRIMARY KEY,
    score INTEGER NOT NULL DEFAULT 0,
    hits INTEGER NOT NULL DEFAULT 0,
    misses INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const upsertScore = db.prepare(`
  INSERT INTO scores (name, score, hits, misses, accuracy, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
  ON CONFLICT(name) DO UPDATE SET
    score = CASE WHEN excluded.score >= scores.score THEN excluded.score ELSE scores.score END,
    hits = CASE WHEN excluded.score >= scores.score THEN excluded.hits ELSE scores.hits END,
    misses = CASE WHEN excluded.score >= scores.score THEN excluded.misses ELSE scores.misses END,
    accuracy = CASE WHEN excluded.score >= scores.score THEN excluded.accuracy ELSE scores.accuracy END,
    updated_at = datetime('now', 'localtime')
`);

const listScores = db.prepare(`
  SELECT name, score, hits, misses, accuracy, updated_at
  FROM scores
  ORDER BY score DESC, accuracy DESC, updated_at ASC
  LIMIT ?
`);

const addSubmission = db.prepare(`
  INSERT INTO submissions (title, filename, mime, created_at)
  VALUES (?, ?, ?, datetime('now', 'localtime'))
`);

const listSubmissions = db.prepare(`
  SELECT id, title, filename, mime, created_at
  FROM submissions
  ORDER BY id DESC
`);

const seedImages = [
  { title: "AI角色：佳小乐", url: "/assets/mental/avatar.png", created_at: "seed" },
  { title: "白大褂权威形态", url: "/assets/mental/labcoat.jpg", created_at: "seed" },
  { title: "视频通话失控A", url: "/assets/mental/call1.jpg", created_at: "seed" },
  { title: "视频通话失控B", url: "/assets/mental/call2.jpg", created_at: "seed" },
  { title: "绿色鬼畜领域", url: "/assets/mental/greenmode.jpg", created_at: "seed" },
  { title: "瞳孔地震瞬间", url: "/assets/mental/wideeye.jpg", created_at: "seed" }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);

    if (req.method === "GET" && url.pathname === "/api/scores") {
      sendJson(res, 200, { scores: listScores.all(20) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/submissions") {
      const uploaded = listSubmissions.all().map(row => ({
        id: row.id,
        title: row.title,
        url: `/uploads/${row.filename}`,
        created_at: row.created_at
      }));
      sendJson(res, 200, { images: [...uploaded, ...seedImages] });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/score") {
      await handleScore(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/submissions") {
      await handleSubmission(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "method_not_allowed" });
      return;
    }

    serveStatic(url.pathname, req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "server_error", detail: error.message });
  }
});

server.listen(port, () => {
  console.log(`AI佳小乐整合项目已启动: http://localhost:${port}`);
});

async function handleScore(req, res) {
  const raw = await readBody(req, 1024 * 32);
  const data = JSON.parse(raw.toString("utf8") || "{}");
  const name = String(data.name || "").trim().slice(0, 18);
  const score = Math.max(0, Math.floor(Number(data.score) || 0));
  const hits = Math.max(0, Math.floor(Number(data.hits) || 0));
  const misses = Math.max(0, Math.floor(Number(data.misses) || 0));
  const accuracy = Math.max(0, Math.min(100, Math.floor(Number(data.accuracy) || 0)));

  if (!name) {
    sendJson(res, 400, { error: "name_required" });
    return;
  }

  upsertScore.run(name, score, hits, misses, accuracy);
  sendJson(res, 200, { ok: true });
}

async function handleSubmission(req, res) {
  const raw = await readBody(req, 1024 * 1024 * 12);
  const file = parseMultipart(raw, req.headers["content-type"]);
  const ext = extensionForMime(file.mime);

  if (!ext) {
    sendJson(res, 400, { error: "unsupported_image_type" });
    return;
  }

  if (!file.body.length) {
    sendJson(res, 400, { error: "empty_file" });
    return;
  }

  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
  const titleBase = path.basename(file.filename || "抽象生物", path.extname(file.filename || ""));
  const title = titleBase.trim().slice(0, 40) || "匿名抽象生物";
  writeFileSync(path.join(uploadsDir, filename), file.body);
  addSubmission.run(title, filename, file.mime);
  sendJson(res, 200, { ok: true, image: { title, url: `/uploads/${filename}` } });
}

async function handleChat(req, res) {
  const raw = await readBody(req, 128 * 1024);
  const input = JSON.parse(raw.toString("utf8") || "{}");
  const userMessage = String(input.message || "").trim();
  const history = Array.isArray(input.history) ? input.history : [];
  const aiConfig = loadAiConfig();

  if (!userMessage) {
    sendJson(res, 400, { error: "Message is required" });
    return;
  }

  if (!aiConfig.apiKey || aiConfig.apiKey.includes("填入你的")) {
    sendJson(res, 500, { error: "请先在 config.yaml 中填写 openai.apiKey" });
    return;
  }

  const client = new OpenAI({
    baseURL: aiConfig.baseURL || "https://api.deepseek.com",
    apiKey: aiConfig.apiKey || process.env.DEEPSEEK_API_KEY || "missing-api-key"
  });

  const messages = [
    { role: "system", content: aiConfig.system_prompt || "你是佳小乐，一个温暖、机灵、会鼓励用户的中文互动角色。" },
    ...history
      .filter(item => item && (item.role === "user" || item.role === "assistant") && item.content)
      .slice(-10)
      .map(item => ({ role: item.role, content: String(item.content).slice(0, 2000) })),
    { role: "user", content: userMessage }
  ];

  const request = {
    messages,
    model: aiConfig.model || "deepseek-v4-pro",
    stream: Boolean(aiConfig.stream)
  };

  if (aiConfig.thinking) request.thinking = aiConfig.thinking;
  if (aiConfig.reasoning_effort) request.reasoning_effort = aiConfig.reasoning_effort;

  const completion = await client.chat.completions.create(request);
  const reply = completion.choices?.[0]?.message?.content || "我刚刚走神了一下，可以再说一遍吗？";
  sendJson(res, 200, { reply });
}

function serveStatic(pathname, req, res) {
  const cleanPath = decodeURIComponent(pathname).replaceAll("\\", "/");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicDir, relativePath);

  if (!absolutePath.startsWith(publicDir + path.sep) && absolutePath !== publicDir) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  const filePath = existsSync(absolutePath) && !statSync(absolutePath).isDirectory()
    ? absolutePath
    : path.join(publicDir, "index.html");

  res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    req.on("data", chunk => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function splitBuffer(buffer, separator) {
  const chunks = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    chunks.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  chunks.push(buffer.subarray(start));
  return chunks;
}

function parseMultipart(buffer, contentTypeHeader) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader || "");
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = Buffer.from("--" + (boundaryMatch[1] || boundaryMatch[2]));
  const parts = splitBuffer(buffer, boundary);

  for (const rawPart of parts) {
    let part = rawPart;
    if (part.length < 8) continue;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === "--") part = part.subarray(0, part.length - 2);
    if (part.subarray(part.length - 2).toString() === "\r\n") part = part.subarray(0, part.length - 2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.subarray(0, headerEnd).toString("utf8");
    const body = part.subarray(headerEnd + 4);
    if (!/name="image"/i.test(headerText)) continue;

    const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);
    return {
      filename: filenameMatch ? filenameMatch[1] : "upload",
      mime: typeMatch ? typeMatch[1].trim().toLowerCase() : "application/octet-stream",
      body
    };
  }

  throw new Error("Image field not found");
}

function extensionForMime(mime) {
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp"
  }[mime] || "";
}

function loadAiConfig() {
  const configPath = path.join(root, "config.yaml");
  if (!existsSync(configPath)) return {};
  const config = parseYaml(readFileSync(configPath, "utf8"));
  return config.openai || {};
}

function parseYaml(text) {
  const rootObject = {};
  const stack = [{ indent: -1, value: rootObject }];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = raw.match(/^ */)[0].length;
    const line = raw.trim();
    const match = line.match(/^([^:]+):(.*)$/);
    if (!match) continue;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;
    const key = match[1].trim();
    let value = match[2].trim();

    if (value === "|") {
      const block = [];
      const blockIndent = indent + 2;
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (!next.trim()) {
          block.push("");
          index += 1;
          continue;
        }
        const nextIndent = next.match(/^ */)[0].length;
        if (nextIndent < blockIndent) break;
        block.push(next.slice(blockIndent));
        index += 1;
      }
      parent[key] = block.join("\n").trim();
    } else if (value === "") {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(value);
    }
  }

  return rootObject;
}

function parseScalar(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}
