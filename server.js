"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
let ROOT = __dirname;
// Normal launch serves the last core release; imported test servers stay on source.
if(require.main===module&&process.env.DASH_PUNCH_DEVELOPMENT!=="1"){
  try{
    const selected=JSON.parse(fs.readFileSync(path.join(__dirname,"playtest-release.json"),"utf8"));
    const candidate=path.resolve(__dirname,selected.directory),relative=path.relative(__dirname,candidate);
    if(relative&&!relative.startsWith("..")&&!path.isAbsolute(relative)&&JSON.parse(fs.readFileSync(path.join(candidate,"build-manifest.json"),"utf8")).edition==="core")ROOT=candidate;
  }catch{}
}
const ROOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const MAX_WEBSOCKET_PAYLOAD = 256 * 1024;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/typography.css", "typography.css"],
  ["/typography.js", "typography.js"],
  ["/game.js", "game.js"],
  ["/menu-stars.js", "menu-stars.js"],
  ["/radial-menu.js", "radial-menu.js"],
  ["/fighter-presentation.js", "fighter-presentation.js"],
  ["/boomerang.js", "boomerang.js"],
  ["/ice.js", "ice.js"],
  ["/ember.js", "ember.js"],
  ["/rollback.js", "rollback.js"],
  ["/match-flow.js", "match-flow.js"],
  ["/lobby-cards.js", "lobby-cards.js"],
  ["/dashball.js", "dashball.js"],
  ["/team-objectives.js", "team-objectives.js"],
  ["/arena-variants.js", "arena-variants.js"],
  ["/target-charge.js", "target-charge.js"],
  ["/sports.js", "sports.js"],
  ["/sports-audio.js", "sports-audio.js"],
  ["/sandbag.js", "sandbag.js"],
  ["/sports-guide.js", "sports-guide.js"],
  ["/presentation-assets.js", "presentation-assets.js"],
  ["/stage-renderer.js", "stage-renderer.js"],
  ["/team-silhouette.js", "team-silhouette.js"],
  ["/README.md", "README.md"],
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};
const rooms = new Map();

class BrowserWebSocket extends EventEmitter {
  constructor(socket, initialData = Buffer.alloc(0)) {
    super();
    this.socket = socket;
    this.readyState = WS_OPEN;
    this.buffer = Buffer.alloc(0);
    this.fragmentOpcode = null;
    this.fragmentChunks = [];
    this.fragmentBytes = 0;
    this.closedEmitted = false;
    socket.on("data", (chunk) => this.receive(chunk));
    socket.on("close", () => this.finishClose());
    socket.on("end", () => this.finishClose());
    socket.on("error", (error) => {
      this.emit("error", error);
      this.finishClose();
    });
    if (initialData.length > 0) this.receive(initialData);
  }

  send(value) {
    if (this.readyState !== WS_OPEN) return;
    this.writeFrame(0x1, Buffer.from(String(value)));
  }

  ping() {
    if (this.readyState === WS_OPEN) this.writeFrame(0x9, Buffer.alloc(0));
  }

  close() {
    if (this.readyState !== WS_OPEN) return;
    this.readyState = WS_CLOSING;
    this.writeFrame(0x8, Buffer.from([0x03, 0xe8]));
    this.socket.end();
  }

  terminate() {
    this.readyState = WS_CLOSED;
    this.socket.destroy();
    this.finishClose();
  }

  writeFrame(opcode, payload) {
    const length = payload.length;
    let header;
    if (length < 126) {
      header = Buffer.from([0x80 | opcode, length]);
    } else if (length <= 0xffff) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }

  receive(chunk) {
    if (this.readyState === WS_CLOSED) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const finalFrame = Boolean(first & 0x80);
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let payloadLength = second & 0x7f;
      let offset = 2;

      if ((first & 0x70) !== 0 || !masked) return this.terminate();
      if (payloadLength === 126) {
        if (this.buffer.length < 4) return;
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) return;
        const largeLength = this.buffer.readBigUInt64BE(2);
        if (largeLength > BigInt(MAX_WEBSOCKET_PAYLOAD)) return this.terminate();
        payloadLength = Number(largeLength);
        offset = 10;
      }
      if (payloadLength > MAX_WEBSOCKET_PAYLOAD) return this.terminate();
      if (this.buffer.length < offset + 4 + payloadLength) return;

      const mask = this.buffer.subarray(offset, offset + 4);
      offset += 4;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + payloadLength));
      this.buffer = this.buffer.subarray(offset + payloadLength);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }

      if (opcode === 0x1) {
        if (this.fragmentOpcode !== null) return this.terminate();
        if (finalFrame) {
          this.emit("message", payload);
        } else {
          this.fragmentOpcode = opcode;
          this.fragmentChunks = [payload];
          this.fragmentBytes = payload.length;
        }
      } else if (opcode === 0x0) {
        if (this.fragmentOpcode === null) return this.terminate();
        this.fragmentChunks.push(payload);
        this.fragmentBytes += payload.length;
        if (this.fragmentBytes > MAX_WEBSOCKET_PAYLOAD) return this.terminate();
        if (finalFrame) {
          const completePayload = Buffer.concat(this.fragmentChunks, this.fragmentBytes);
          this.fragmentOpcode = null;
          this.fragmentChunks = [];
          this.fragmentBytes = 0;
          this.emit("message", completePayload);
        }
      } else if (opcode === 0x8) {
        if (!finalFrame) return this.terminate();
        if (this.readyState === WS_OPEN) this.writeFrame(0x8, payload);
        this.readyState = WS_CLOSING;
        this.socket.end();
        return;
      } else if (opcode === 0x9) {
        if (!finalFrame) return this.terminate();
        this.writeFrame(0xa, payload);
      } else if (opcode === 0xa) {
        if (!finalFrame) return this.terminate();
        this.emit("pong");
      } else {
        return this.terminate();
      }
    }
  }

  finishClose() {
    if (this.closedEmitted) return;
    this.closedEmitted = true;
    this.readyState = WS_CLOSED;
    this.emit("close");
  }
}

function send(socket, message) {
  if (socket?.readyState === WS_OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function createRoomCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Could not allocate a room code");
}

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

function clearSocketRoom(socket, reason = "Opponent disconnected.") {
  const code = socket.roomCode;
  const role = socket.roomRole;
  socket.roomCode = null;
  socket.roomRole = null;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  if (role === "host" && room.host === socket) {
    send(room.guest, { type: "peer-left", reason: "Host disconnected." });
    if (room.guest) {
      room.guest.roomCode = null;
      room.guest.roomRole = null;
    }
    rooms.delete(code);
    return;
  }

  if (role === "guest" && room.guest === socket) {
    room.guest = null;
    send(room.host, { type: "peer-left", reason });
  }
}

function handleSignalMessage(socket, message) {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "host") {
    clearSocketRoom(socket);
    const code = createRoomCode();
    rooms.set(code, { host: socket, guest: null, createdAt: Date.now() });
    socket.roomCode = code;
    socket.roomRole = "host";
    send(socket, { type: "hosted", room: code });
    return;
  }

  if (message.type === "join") {
    clearSocketRoom(socket);
    const code = normalizeRoomCode(message.room);
    const room = rooms.get(code);
    if (!room || room.host.readyState !== WS_OPEN) {
      send(socket, { type: "error", message: "That room is not available." });
      return;
    }
    if (room.guest && room.guest.readyState === WS_OPEN) {
      send(socket, { type: "error", message: "That room already has two players." });
      return;
    }
    room.guest = socket;
    socket.roomCode = code;
    socket.roomRole = "guest";
    send(socket, { type: "joined", room: code });
    send(room.host, { type: "guest-joined" });
    return;
  }

  if (message.type === "signal") {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const peer = socket.roomRole === "host" ? room.guest : room.host;
    send(peer, { type: "signal", payload: message.payload });
    return;
  }

  if (message.type === "relay") {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const peer = socket.roomRole === "host" ? room.guest : room.host;
    send(peer, { type: "relay", payload: message.payload });
    return;
  }

  if (message.type === "drop-guest" && socket.roomRole === "host") {
    const room = rooms.get(socket.roomCode);
    if (room?.guest) {
      send(room.guest, { type: "peer-left", reason: "Host reset the connection." });
      room.guest.roomCode = null;
      room.guest.roomRole = null;
      room.guest = null;
    }
    return;
  }

  if (message.type === "leave") {
    clearSocketRoom(socket, "Opponent returned to the menu.");
  }
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  let assetPath;
  try { assetPath = decodeURIComponent(requestUrl.pathname); }
  catch {
    response.writeHead(400, { "content-type":"text/plain; charset=utf-8" });
    response.end("Invalid URL");
    return;
  }
  const publicFile = PUBLIC_FILES.get(requestUrl.pathname) ||
    (assetPath.startsWith("/assets/") && [".png", ".gif", ".jpg", ".jpeg", ".txt", ".md", ".wav", ".woff2"].includes(path.extname(assetPath).toLowerCase()) &&
      !assetPath.includes("\\") && !assetPath.split("/").includes("..") ? assetPath.slice(1) : null);
  if (!publicFile) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const filePath = path.join(ROOT, publicFile);
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Could not load Dash Punch");
      return;
    }
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const headers = {
      "content-type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-cache",
      "etag": etag,
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
    };
    if (request.headers["if-none-match"] === etag) {
      response.writeHead(304, headers);
      response.end();
      return;
    }
    fs.readFile(filePath, (readError, body) => {
      if (readError) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("Could not load Dash Punch");
        return;
      }
      response.writeHead(200, headers);
      response.end(body);
    });
  });
});

const signaling = new EventEmitter();
signaling.clients = new Set();

server.on("upgrade", (request, socket, head) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const key = request.headers["sec-websocket-key"];
  const validUpgrade =
    requestUrl.pathname === "/signal" &&
    String(request.headers.upgrade || "").toLowerCase() === "websocket" &&
    request.headers["sec-websocket-version"] === "13" &&
    typeof key === "string";
  if (!validUpgrade) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n",
  ].join("\r\n"));

  const peer = new BrowserWebSocket(socket, head);
  signaling.clients.add(peer);
  peer.once("close", () => signaling.clients.delete(peer));
  signaling.emit("connection", peer);
});

signaling.on("connection", (socket) => {
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });
  socket.on("message", (data) => {
    try {
      handleSignalMessage(socket, JSON.parse(data.toString()));
    } catch (_error) {
      send(socket, { type: "error", message: "Unreadable signaling message." });
    }
  });
  socket.on("close", () => clearSocketRoom(socket));
  socket.on("error", () => clearSocketRoom(socket));
});

let heartbeat = null;

function startServer(port = PORT, host = HOST) {
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      for (const socket of signaling.clients) {
        if (!socket.isAlive) {
          socket.terminate();
          continue;
        }
        socket.isAlive = false;
        socket.ping();
      }
    }, 30000);
  }
  server.listen(port, host, () => {
    console.log(`Dash Punch is running at http://localhost:${port}`);
  });
  return server;
}

server.on("close", () => {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
});

if (require.main === module) {
  startServer();
  if(process.env.DASH_PUNCH_LOCAL_ALIASES==="1")for(const port of [8081,8082]){
    if(port===PORT)continue;
    const alias=http.createServer((request,response)=>{
      response.writeHead(302,{location:`http://localhost:${PORT}${request.url}`,"cache-control":"no-store"});response.end();
    });
    alias.on("error",()=>{});alias.listen(port,"127.0.0.1");
  }
}

module.exports = {
  BrowserWebSocket,
  WS_OPEN,
  clearSocketRoom,
  handleSignalMessage,
  normalizeRoomCode,
  rooms,
  server,
  signaling,
  startServer,
};
