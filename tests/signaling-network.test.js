"use strict";

const { spawn } = require("node:child_process");

const port = 18080 + Math.floor(Math.random() * 1000);
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});

const cleanup = () => {
  if (!server.killed) server.kill("SIGTERM");
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server did not start")), 5000);
    server.stdout.on("data", (chunk) => {
      if (!String(chunk).includes("Dash Punch is running")) return;
      clearTimeout(timeout);
      resolve();
    });
    server.stderr.on("data", (chunk) => {
      clearTimeout(timeout);
      reject(new Error(String(chunk)));
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) reject(new Error(`server exited with code ${code}`));
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/signal`);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket client connection failed")), { once: true });
  });
}

function nextMessage(socket, expectedType, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", onMessage);
      reject(new Error(`timed out waiting for ${expectedType}`));
    }, timeoutMs);
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.type !== expectedType) return;
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      resolve(message);
    };
    socket.addEventListener("message", onMessage);
  });
}

async function run() {
  await waitForServer();
  const host = await connect();
  host.send(JSON.stringify({ type: "host" }));
  const hosted = await nextMessage(host, "hosted");
  if (!/^[A-Z0-9]{6}$/.test(hosted.room)) throw new Error("server returned an invalid room code");

  const guest = await connect();
  const guestJoined = nextMessage(guest, "joined");
  const hostSawGuest = nextMessage(host, "guest-joined");
  guest.send(JSON.stringify({ type: "join", room: hosted.room }));
  await Promise.all([guestJoined, hostSawGuest]);

  const relayedInput = nextMessage(host, "relay");
  guest.send(JSON.stringify({ type: "relay", payload: {
    type: "input",
    sequence: 11,
    input: { aimX: 0.25, aimY: -0.75, dashHeld: true, punchHeld: true },
  } }));
  const relay = await relayedInput;
  if (relay.payload?.sequence !== 11 || !relay.payload?.input?.dashHeld || !relay.payload?.input?.punchHeld) {
    throw new Error("relayed normalized input changed in transit");
  }

  const peerLeft = nextMessage(host, "peer-left");
  guest.close();
  await peerLeft;
  host.close();
  cleanup();
  console.log(JSON.stringify({ tests: "passed", roomCreated: true, guestJoined: true, inputRelayed: true, disconnectNotified: true }));
}

run().catch((error) => {
  cleanup();
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
