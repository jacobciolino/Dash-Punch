"use strict";

const { EventEmitter } = require("node:events");
const {
  BrowserWebSocket,
  WS_OPEN,
  clearSocketRoom,
  handleSignalMessage,
  rooms,
  server,
  signaling,
} = require("../server.js");

class RoomSocket {
  constructor() {
    this.readyState = WS_OPEN;
    this.sent = [];
    this.roomCode = null;
    this.roomRole = null;
  }

  send(value) {
    this.sent.push(JSON.parse(value));
  }
}

class MemorySocket extends EventEmitter {
  constructor() {
    super();
    this.writes = [];
    this.ended = false;
    this.destroyed = false;
  }

  write(value) {
    this.writes.push(Buffer.from(value));
  }

  end() {
    this.ended = true;
  }

  destroy() {
    this.destroyed = true;
  }
}

let healthResponse = null;
server.emit(
  "request",
  { url: "/health", headers: { host: "localhost" } },
  {
    writeHead(status, headers) {
      healthResponse = { status, headers, body: "" };
    },
    end(body) {
      healthResponse.body = String(body);
    },
  },
);
if (healthResponse?.status !== 200 || JSON.parse(healthResponse.body).ok !== true) {
  throw new Error("health endpoint did not report a ready server");
}

const upgradeTransport = new MemorySocket();
server.emit(
  "upgrade",
  {
    url: "/signal",
    headers: {
      host: "localhost",
      upgrade: "websocket",
      "sec-websocket-version": "13",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
    },
  },
  upgradeTransport,
  Buffer.alloc(0),
);
const upgradeResponse = upgradeTransport.writes[0]?.toString() || "";
if (!upgradeResponse.includes("101 Switching Protocols") || !upgradeResponse.includes("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=")) {
  throw new Error("browser WebSocket upgrade handshake was invalid");
}
upgradeTransport.emit("close");
if (signaling.clients.size !== 0) throw new Error("closed browser socket remained registered");

function maskedClientFrame(opcode, value, finalFrame = true) {
  const payload = Buffer.from(value);
  const mask = Buffer.from([0x13, 0x37, 0xc0, 0xde]);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([(finalFrame ? 0x80 : 0) | opcode, 0x80 | payload.length]);
  } else {
    header = Buffer.alloc(4);
    header[0] = (finalFrame ? 0x80 : 0) | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  const masked = Buffer.from(payload);
  for (let index = 0; index < masked.length; index += 1) masked[index] ^= mask[index % 4];
  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrame(frame) {
  const opcode = frame[0] & 0x0f;
  let length = frame[1] & 0x7f;
  let offset = 2;
  if (length === 126) {
    length = frame.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    length = Number(frame.readBigUInt64BE(offset));
    offset += 8;
  }
  return { opcode, value: frame.subarray(offset, offset + length).toString() };
}

rooms.clear();
const host = new RoomSocket();
const guest = new RoomSocket();
handleSignalMessage(host, { type: "host" });
const hosted = host.sent.shift();
if (hosted?.type !== "hosted" || !/^[A-Z0-9]{6}$/.test(hosted.room)) {
  throw new Error("room creation did not return a valid code");
}

handleSignalMessage(guest, { type: "join", room: hosted.room });
if (guest.sent.shift()?.type !== "joined" || host.sent.shift()?.type !== "guest-joined") {
  throw new Error("host and guest did not receive their join events");
}

const input = {
  type: "input",
  sequence: 11,
  input: { aimX: 0.25, aimY: -0.75, dashHeld: true, punchHeld: true },
};
handleSignalMessage(guest, { type: "relay", payload: input });
const relayed = host.sent.shift();
if (relayed?.type !== "relay" || relayed.payload?.sequence !== 11) {
  throw new Error("relay traffic did not reach the room peer");
}

clearSocketRoom(guest);
if (host.sent.shift()?.type !== "peer-left") throw new Error("host was not notified of guest departure");
clearSocketRoom(host);
if (rooms.size !== 0) throw new Error("room was not removed when its host left");

const transport = new MemorySocket();
const webSocket = new BrowserWebSocket(transport);
webSocket.on("error", () => {});
const incomingValue = JSON.stringify({ type: "snapshot", payload: "x".repeat(7000) });
let receivedValue = "";
webSocket.on("message", (value) => {
  receivedValue = value.toString();
});
const incomingFrame = maskedClientFrame(0x1, incomingValue);
webSocket.receive(incomingFrame.subarray(0, 37));
webSocket.receive(incomingFrame.subarray(37));
if (receivedValue !== incomingValue) throw new Error("masked browser frame was not decoded intact");

receivedValue = "";
webSocket.receive(maskedClientFrame(0x1, "fragmented ", false));
webSocket.receive(maskedClientFrame(0x0, "message"));
if (receivedValue !== "fragmented message") throw new Error("fragmented browser message was not reassembled");

webSocket.send(JSON.stringify({ type: "relay", ok: true }));
const outgoing = decodeServerFrame(transport.writes.at(-1));
if (outgoing.opcode !== 0x1 || JSON.parse(outgoing.value).type !== "relay") {
  throw new Error("server text frame was not encoded intact");
}

webSocket.receive(maskedClientFrame(0x9, "hi"));
if (decodeServerFrame(transport.writes.at(-1)).opcode !== 0x0a) {
  throw new Error("browser ping did not receive a pong");
}

console.log(JSON.stringify({
  tests: "passed",
  healthEndpoint: true,
  browserUpgradeHandshake: true,
  roomCreated: true,
  guestJoined: true,
  inputRelayed: true,
  disconnectNotified: true,
  browserFrameDecoded: true,
  fragmentedMessageDecoded: true,
  serverFrameEncoded: true,
  heartbeatPong: true,
}));
