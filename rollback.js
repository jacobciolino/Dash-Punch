"use strict";

// Transport-independent history: state N is the state immediately before input N.
((root) => {
  const neutral = () => ({ a: -1, b: 0 });
  const FLAGS = ["dashHeld", "punchHeld", "downHeld", "upHeld", "dashPressed", "dashReleased", "punchPressed", "punchReleased", "downPressed"];
  const heldMask = 15;
  function encode(input = {}) {
    const hasAim = input.hasAim ?? Math.hypot(input.aimX || 0, input.aimY || 0) > 0.01;
    return { a: hasAim ? ((Math.round(Math.atan2(input.aimY || 0, input.aimX || 0) * 4096 / (2 * Math.PI)) % 4096) + 4096) % 4096 : -1,
      b: FLAGS.reduce((bits, name, i) => bits | (input[name] ? 1 << i : 0), 0) };
  }
  function decode(input) {
    const angle = input.a * Math.PI * 2 / 4096;
    return { aimX: input.a < 0 ? 0 : Math.cos(angle), aimY: input.a < 0 ? 0 : Math.sin(angle), hasAim: input.a >= 0,
      ...Object.fromEntries(FLAGS.map((name, i) => [name, Boolean(input.b & (1 << i))])) };
  }
  const predict = input => ({ a: input.a, b: input.b & heldMask });
  const equal = (a, b) => a.a === b.a && a.b === b.b;
  function stable(value) {
    if (value === undefined) return "null";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  function hash(value) {
    const text = stable(value);
    let result = 2166136261;
    for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619);
    return (result >>> 0).toString(16).padStart(8, "0");
  }
  class Manager {
    constructor({ save, restore, simulate, stateHash = hash, localPlayer = 0, window = 8 }) {
      Object.assign(this, { save, restore, simulate, stateHash, localPlayer, window });
      this.frame = 0;
      this.confirmed = -1;
      this.local = new Map(); this.remote = new Map(); this.used = new Map();
      this.states = new Map(); this.hashes = new Map();
      this.rollbacks = 0; this.maxDepth = 0; this.lastDepth = 0;
      this.dirty = null; this.error = null; this.waiting = false;
      this.states.set(0, save());
      this.hashes.set(0, stateHash(this.states.get(0)));
    }
    receive(frame, input) {
      if (!Number.isInteger(frame) || frame < 0 || frame > this.frame + 240 || !Number.isInteger(input?.a) || input.a < -1 || input.a > 4095 || !Number.isInteger(input?.b) || input.b < 0 || input.b > 511) {
        throw new Error("Invalid rollback input");
      }
      const old = this.remote.get(frame);
      if (old && !equal(old, input)) throw new Error("Conflicting remote input");
      this.remote.set(frame, { ...input });
      if (this.used.has(frame) && !equal(this.used.get(frame), input)) this.dirty = Math.min(this.dirty ?? frame, frame);
      while (this.remote.has(this.confirmed + 1)) this.confirmed++;
    }
    remoteAt(frame) {
      if (this.remote.has(frame)) return this.remote.get(frame);
      for (let i = frame - 1; i >= Math.max(0, frame - this.window - 1); i--) {
        const prior = this.remote.get(i) || this.used.get(i);
        if (prior) return predict(prior);
      }
      return neutral();
    }
    run(frame, replay) {
      const remote = this.remoteAt(frame);
      this.used.set(frame, { ...remote });
      const inputs = this.localPlayer === 0 ? [this.local.get(frame), remote] : [remote, this.local.get(frame)];
      this.simulate(inputs.map(decode), replay, frame);
      const state = this.save();
      this.states.set(frame + 1, state);
      this.hashes.set(frame + 1, this.stateHash(state));
    }
    reconcile() {
      if (this.dirty === null) return;
      const start = this.dirty;
      const depth = this.frame - start;
      if (!this.states.has(start) || depth > this.window) {
        this.error = "Rollback window exceeded";
        throw new Error(this.error);
      }
      this.restore(this.states.get(start));
      for (let frame = start; frame < this.frame; frame++) this.run(frame, true);
      this.rollbacks++; this.lastDepth = depth; this.maxDepth = Math.max(this.maxDepth, depth);
      this.dirty = null;
    }
    advance(input) {
      this.reconcile();
      if (!this.local.has(this.frame)) this.local.set(this.frame, { ...input });
      this.waiting = this.frame - this.confirmed > this.window;
      if (this.waiting) return false;
      this.run(this.frame++, false);
      const oldest = this.frame - this.window;
      for (const key of this.states.keys()) if (key < oldest) this.states.delete(key);
      for (const map of [this.local, this.remote, this.used, this.hashes]) {
        for (const key of map.keys()) if (key < this.frame - 240) map.delete(key);
      }
      return true;
    }
    packet() {
      return [...this.local.entries()].filter(([frame]) => frame >= this.frame - 16).map(([frame, input]) => [frame, input.a, input.b]);
    }
  }
  const api = { Manager, encode, decode, neutral, predict, hash };
  if (typeof module !== "undefined") module.exports = api;
  root.DashRollback = api;
})(globalThis);
