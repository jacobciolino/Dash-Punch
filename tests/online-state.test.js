"use strict";

const fs = require("node:fs");
const vm = require("node:vm");

function noop() {}

const context2d = new Proxy(
  { measureText: (value) => ({ width: String(value).length * 8 }) },
  {
    get: (target, key) => (key in target ? target[key] : noop),
    set: (target, key, value) => ((target[key] = value), true),
  },
);

function makeElement(id = "") {
  return {
    id,
    width: id === "game" ? 1280 : 0,
    height: id === "game" ? 720 : 0,
    style: {},
    dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: (child) => child,
    addEventListener: noop,
    setAttribute: noop,
    removeAttribute: noop,
    focus: noop,
    scrollIntoView: noop,
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 30 }),
    getContext: () => context2d,
    closest: () => null,
    innerHTML: "",
    textContent: "",
    disabled: false,
    hidden: false,
  };
}

const elements = new Map();
const document = {
  body: makeElement("body"),
  activeElement: null,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  createElement: (tag) => makeElement(tag),
};
const window = {
  location: {
    protocol: "http:",
    host: "localhost:8080",
    href: "http://localhost:8080/?debugHitboxes=1",
    search: "?debugHitboxes=1",
  },
  addEventListener: noop,
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
};
const sandbox = {
  console,
  document,
  window,
  navigator: { getGamepads: () => [] },
  performance: { now: () => 1000 },
  requestAnimationFrame: noop,
  URL,
  URLSearchParams,
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("typography.js", "utf8"), sandbox, { filename: "typography.js" });
vm.runInContext(fs.readFileSync("rollback.js", "utf8"), sandbox, { filename: "rollback.js" });
vm.runInContext(fs.readFileSync("presentation-assets.js", "utf8"), sandbox, { filename: "presentation-assets.js" });
if (process.env.DASH_PUNCH_DISABLE_ART) sandbox.window.DASH_PUNCH_ART.enabled = false;
vm.runInContext(fs.readFileSync("game.js", "utf8"), sandbox, { filename: "game.js" });

const debug = window.__dashPunchDebug;
if (!debug?.online) throw new Error("online debug bridge was not created");
if (!elements.get("menuLayer").innerHTML.includes(">Play<")) throw new Error("Play is missing from the title menu");

const remotePacket = {
  type: "input",
  sequence: 7,
  input: {
    aimX: 0.6,
    aimY: -0.8,
    hasAim: true,
    dashHeld: true,
    dashPressed: true,
    punchHeld: true,
    punchPressed: true,
  },
};
debug.online.receiveInput(remotePacket);
const firstRemoteRead = debug.online.readRemoteInput(1);
const secondRemoteRead = debug.online.readRemoteInput(1);
if (!firstRemoteRead.dashHeld || !firstRemoteRead.punchHeld) throw new Error("simultaneous online holds were lost");
if (!firstRemoteRead.dashPressed || !firstRemoteRead.punchPressed) throw new Error("online input edges were lost");
if (secondRemoteRead.dashPressed || secondRemoteRead.punchPressed) throw new Error("online input edges repeated");
if (!secondRemoteRead.dashHeld || !secondRemoteRead.punchHeld) throw new Error("online held actions did not persist");
if (Math.abs(firstRemoteRead.aimX - 0.6) > 0.0001 || Math.abs(firstRemoteRead.aimY + 0.8) > 0.0001) {
  throw new Error("360-degree online aim changed in transit");
}

const snapshot = debug.online.createSnapshot();
if (snapshot.fighters.length !== 2) throw new Error("online snapshot did not include both fighters");
const snapshotBytes = Buffer.byteLength(JSON.stringify(snapshot));
if (snapshotBytes > 64000) throw new Error(`online snapshot is unexpectedly large: ${snapshotBytes} bytes`);
snapshot.sequence = 99;
snapshot.fighters[0].x = 777;
snapshot.fighters[0].y = 333;
snapshot.fighters[0].health = 12;
debug.online.installSnapshot(snapshot);
if (debug.fighters[0].x !== 777 || debug.fighters[0].y !== 333 || debug.fighters[0].health !== 12) {
  throw new Error("authoritative fighter snapshot did not apply");
}

debug.ai.configure({
  stageName: "Flat",
  teamModeId: "pairs",
  teams: [0, 0],
});
if (debug.ai.chooseOpponent(0) !== null || debug.ai.chooseOpponent(1) !== null) {
  throw new Error("AI intentionally targeted a teammate when no enemy was alive");
}

debug.ai.configure({
  stageName: "Flat",
  teamModeId: "pairs",
  teams: [0, 0, 1],
  positions: [{ x: 260, y: 540 }, { x: 340, y: 540 }, { x: 980, y: 540 }],
});
if (debug.ai.chooseOpponent(0) !== 2) {
  throw new Error("AI did not prefer the opposing team over a nearby teammate");
}

debug.ai.configure({
  stageName: "Corners",
  teamModeId: "ffa",
  teams: [0, 1],
  positions: [{ x: 640, y: 450 }, { x: 640, y: 250 }],
});
const platformRoute = debug.ai.getRoute(0, 1);
if (!platformRoute?.usesWrap || !platformRoute.avoidedBlocker || platformRoute.aim.y <= 0) {
  throw new Error("AI did not route downward through vertical wrap around a solid platform");
}

debug.ai.configure({
  stageName: "Block",
  teamModeId: "ffa",
  teams: [0, 1],
  positions: [{ x: 400, y: 480 }, { x: 880, y: 480 }],
});
const horizontalWrapRoute = debug.ai.getRoute(0, 1);
if (!horizontalWrapRoute?.usesWrap || !horizontalWrapRoute.avoidedBlocker || horizontalWrapRoute.aim.x >= 0) {
  throw new Error("AI did not choose the clear horizontal wrap around a central solid block");
}

debug.ai.configure({
  stageName: "Flat",
  teamModeId: "ffa",
  teams: [0, 1],
  positions: [{ x: 438, y: 300 }, { x: 470, y: 355 }],
});
const kickoffAttacker = debug.fighters[0];
const kickoffDefender = debug.fighters[1];
Object.assign(kickoffAttacker, {
  prevX: 408,
  prevY: 300,
  vx: 900,
  vy: 0,
  dashDir: { x: 1, y: 0 },
  dashCarryTimer: 0.3,
  onGround: false,
  wallSliding: false,
  hitstun: 0,
  hitstop: 0,
  dashReboundLockout: 0,
});
Object.assign(kickoffDefender, {
  hitstun: 0,
  comboHits: 0,
  comboGrace: 0,
  lastAttacker: null,
  invulnerable: 0,
  dashReboundLockout: 0,
});
if (!debug.isDashReboundCandidate(0, 1)) {
  throw new Error("neutral kickoff did not receive the new global lateral forgiveness");
}
kickoffDefender.y = 385;
if (debug.isDashReboundCandidate(0, 1)) throw new Error("neutral kickoff exceeded its lateral allowance");
Object.assign(kickoffDefender, {
  hitstun: 0.4,
  comboHits: 1,
  comboGrace: 0.6,
  lastAttacker: kickoffAttacker,
});
if (!debug.isDashReboundCandidate(0, 1)) {
  throw new Error("combo kickoff did not receive lateral forgiveness");
}

function armTestPunch(fighter, direction = { x: 1, y: 0 }) {
  fighter.attack = {
    id: 999,
    age: 0.1,
    startup: 0,
    active: 0.2,
    recovery: 0.2,
    total: 0.4,
    dir: direction,
    charge: 0,
    hitTargets: new Set(),
    clashed: false,
    selfCancelled: false,
    grounded: true,
  };
}

Object.assign(kickoffAttacker, {
  x: 420,
  y: 540,
  vx: 0,
  vy: 0,
  aim: { x: 1, y: 0 },
  hasLiveAim: true,
  hitstun: 0,
  chargingDash: false,
});
Object.assign(kickoffDefender, {
  x: 500,
  y: 540,
  vx: 0,
  vy: 0,
  onGround: true,
  hitstun: 0,
  stunType: "",
  comboHits: 0,
  comboDamage: 0,
  comboGrace: 0,
  lastAttacker: null,
  invulnerable: 0,
  floorTechVulnerable: 0,
  knockdownTimer: 0,
  chargingPunch: false,
  health: kickoffDefender.data.maxHealth,
});
armTestPunch(kickoffAttacker);
debug.resolveHit(0, 1);
const neutralPunchVy = kickoffDefender.vy;

Object.assign(kickoffDefender, {
  vx: 0,
  vy: 0,
  onGround: true,
  hitstun: 0.35,
  stunType: "",
  comboHits: 1,
  comboDamage: 10,
  comboGrace: 0.6,
  lastAttacker: kickoffAttacker,
  invulnerable: 0,
  floorTechVulnerable: 0,
  knockdownTimer: 0,
  health: kickoffDefender.data.maxHealth,
});
armTestPunch(kickoffAttacker);
debug.resolveHit(0, 1);
const comboPunchVy = kickoffDefender.vy;
if (!(comboPunchVy < neutralPunchVy - 80 && comboPunchVy < 0)) {
  throw new Error(`combo follow-up did not gain upward lift: neutral=${neutralPunchVy}, combo=${comboPunchVy}`);
}

Object.assign(kickoffDefender, {
  surfaceBounceSource: "punch",
  surfaceBounceCount: 0,
});
const firstPunchBounce = debug.getHitstunSurfaceRestitution(1, "floor");
kickoffDefender.surfaceBounceCount = 2;
const thirdPunchBounce = debug.getHitstunSurfaceRestitution(1, "floor");
if (!(firstPunchBounce > thirdPunchBounce)) {
  throw new Error("repeated combo bounces did not lose energy");
}

const flatFloorY = 604;
const defenderHalfHeight = kickoffDefender.data.height * 0.5;
Object.assign(kickoffDefender, {
  x: 640,
  y: flatFloorY - defenderHalfHeight + 3,
  prevX: 640,
  prevY: flatFloorY - defenderHalfHeight - 8,
  vx: 120,
  vy: 600,
  onGround: false,
  crouching: false,
  hitstun: 0.5,
  stunType: "",
  comboHits: 2,
  comboGrace: 0.7,
  lastAttacker: kickoffAttacker,
  surfaceBounceSource: "punch",
  surfaceBounceCount: 0,
  knockdownImpactPending: false,
  knockdownSource: null,
  floorTechReady: 0,
  floorTechCooldown: 0,
  floorTechVulnerable: 0,
  floorTechMissArmed: false,
});
if (debug.isSurfaceTechEligible(1)) {
  throw new Error("ordinary punch bounce incorrectly became techable");
}
debug.resolveTerrain(1);
if (!(kickoffDefender.vy < -400 && kickoffDefender.surfaceBounceCount === 1)) {
  throw new Error(`punch floor bounce was not strong: vy=${kickoffDefender.vy}`);
}

Object.assign(kickoffDefender, {
  x: 640,
  y: flatFloorY - defenderHalfHeight - 14,
  prevX: 640,
  prevY: flatFloorY - defenderHalfHeight - 20,
  vx: 0,
  vy: 600,
  onGround: false,
  hitstun: 0.68,
  stunType: "knockdown",
  comboHits: 2,
  comboGrace: 0.8,
  lastAttacker: kickoffAttacker,
  surfaceBounceSource: "kickoff",
  surfaceBounceCount: 0,
  knockdownTimer: 0.68,
  knockdownImpactPending: true,
  knockdownSource: kickoffAttacker,
  floorTechReady: 0,
  floorTechCooldown: 0,
  floorTechVulnerable: 0,
  floorTechMissArmed: false,
  invulnerable: 0,
  health: kickoffDefender.data.maxHealth,
});
if (!debug.isSurfaceTechEligible(1) || !debug.queueSurfaceTech(1, { x: 0, y: 1 })) {
  throw new Error("kickoff floor bounce did not accept a buffered tech");
}
kickoffDefender.y = flatFloorY - defenderHalfHeight + 3;
debug.resolveTerrain(1);
if (kickoffDefender.stunType !== "floorTech" || kickoffDefender.vy !== 0) {
  throw new Error("buffered kickoff floor tech did not resolve");
}

Object.assign(kickoffDefender, {
  x: 640,
  y: flatFloorY - defenderHalfHeight + 3,
  prevX: 640,
  prevY: flatFloorY - defenderHalfHeight - 8,
  vx: 120,
  vy: 600,
  onGround: false,
  hitstun: 0.68,
  stunType: "knockdown",
  comboHits: 2,
  comboGrace: 0.8,
  lastAttacker: kickoffAttacker,
  surfaceBounceSource: "kickoff",
  surfaceBounceCount: 0,
  knockdownTimer: 0.68,
  knockdownImpactPending: true,
  knockdownSource: kickoffAttacker,
  floorTechReady: 0,
  floorTechCooldown: 0,
  floorTechVulnerable: 0,
  floorTechMissArmed: false,
  invulnerable: 0,
  health: kickoffDefender.data.maxHealth,
});
debug.resolveTerrain(1);
if (!(kickoffDefender.vy < -480)) {
  throw new Error(`unteched kickoff did not keep strong bounce speed: vy=${kickoffDefender.vy}`);
}

debug.ai.configure({ stageName: "Flat", teams: [0, 1] });
const chargingFighter = debug.fighters[0];
Object.assign(chargingFighter, { whiffLag: 0.4, punchLockout: 0.4, hitstop: 0, attack: null });
chargingFighter.controls.actions.punchHeld = true;
chargingFighter.controls.buffers.punchPressed = 0;
for (let frame = 0; frame < 12; frame += 1) debug.updateHumanInput(0);
if (!chargingFighter.chargingPunch || !debug.isShielding(0) || chargingFighter.attack) {
  throw new Error("holding Punch during whiff recovery failed to charge and shield without attacking");
}
const storedCharge = chargingFighter.punchCharge;
chargingFighter.controls.actions.punchHeld = false;
chargingFighter.controls.buffers.punchReleased = 0.09;
debug.updateHumanInput(0);
if (!chargingFighter.punchReleaseQueued || chargingFighter.attack || debug.isShielding(0)) {
  throw new Error("early release failed to queue a punch or left shield active after release");
}
chargingFighter.whiffLag = 0;
chargingFighter.punchLockout = 0.05;
debug.updateHumanInput(0);
if (chargingFighter.attack) throw new Error("buffered punch bypassed the remaining punch lockout");
chargingFighter.punchLockout = 0;
debug.updateHumanInput(0);
if (!chargingFighter.attack || Math.abs(chargingFighter.attack.charge - storedCharge / chargingFighter.data.punchChargeTime) > 0.0001) {
  throw new Error("buffered punch failed to fire with stored charge after recovery");
}
debug.updateHumanInput(0);
if (chargingFighter.punchPending || chargingFighter.punchReleaseQueued) {
  throw new Error("buffered punch repeated after execution");
}

debug.ai.configure({ stageName: "Uplift", teams: [0, 1] });
const risingPlatforms = debug.advancePlatforms(0);
if (risingPlatforms.length !== 3 || risingPlatforms.some((platform) => platform.kind !== "oneway")) {
  throw new Error("Uplift did not provide three pass-through platforms");
}
const rider = debug.fighters[0];
const airborne = debug.fighters[1];
Object.assign(rider, {
  x: 400, y: risingPlatforms[0].y - rider.data.height / 2,
  prevY: risingPlatforms[0].y - rider.data.height / 2,
  onGround: true, groundTerrainId: risingPlatforms[0].id,
});
const airborneY = airborne.y;
const ridingStartY = rider.y;
debug.advancePlatforms(1);
if (Math.abs(rider.y - (ridingStartY - 65)) > 0.001 || airborne.y !== airborneY) {
  throw new Error("rising platform failed to carry its standing rider independently of airborne fighters");
}
const wrappedPlatforms = debug.advancePlatforms(1.5);
const feet = rider.y + rider.data.height / 2;
if (wrappedPlatforms[0].y < 700 || Math.abs(feet - wrappedPlatforms[0].y) > 0.001) {
  throw new Error("rider failed to wrap from top to bottom with the platform");
}
// Validate actual landing and carry across ordinary simulation-sized steps.
const support = wrappedPlatforms[1];
Object.assign(rider, {
  x: 400, y: support.y - rider.data.height / 2 + 2,
  prevY: support.y - rider.data.height / 2 - 4,
  vx: 0, vy: 120, onGround: false, hitstun: 0,
});
debug.resolveTerrain(0);
if (!rider.onGround || rider.groundTerrainId !== support.id) {
  throw new Error("fighter failed to land on a rising platform");
}
debug.advancePlatforms(1 / 60);
rider.prevY = rider.y;
rider.y += 0.4;
rider.vy = 24;
debug.resolveTerrain(0);
if (!rider.onGround || Math.abs(rider.y + rider.data.height / 2 - (support.y - 65 / 60)) > 0.001) {
  throw new Error("standing rider lost platform contact or received double platform motion");
}

debug.ai.configure({ stageName: "Flip Chamber", teams: [0, 1] });
const switchHitter = debug.fighters[0];
const ceilingRider = debug.fighters[1];
Object.assign(switchHitter, { x: 580, y: 360, hitstun: 0, onGround: false });
armTestPunch(switchHitter);
Object.assign(switchHitter, { airDashes: 0, whiffLag: 0.3, punchLockout: 0.3 });
debug.gravity.hitSwitch();
if (debug.gravity.direction !== -1 || switchHitter.attack || switchHitter.whiffLag !== 0 || switchHitter.punchLockout !== 0 || switchHitter.airDashes !== switchHitter.data.maxAirDashes) {
  throw new Error("punching the gravity switch did not flip gravity and consume the strike");
}
armTestPunch(switchHitter);
debug.gravity.hitSwitch();
if (debug.gravity.direction !== -1) throw new Error("overlapping switch hits bypassed its cooldown");
Object.assign(ceilingRider, { x: 950, y: 300, vx: 0, vy: 0, hitstun: 0, onGround: false });
debug.gravity.physics(1);
if (ceilingRider.vy >= 0) throw new Error("inverted gravity did not accelerate fighters upward");
Object.assign(ceilingRider, {
  y: 44 + ceilingRider.data.height / 2 - 2,
  vy: -200, hitstun: 0, onGround: false, airDashes: 0,
});
debug.resolveTerrain(1);
if (!ceilingRider.onGround || ceilingRider.vy !== 0 || ceilingRider.airDashes !== ceilingRider.data.maxAirDashes) {
  throw new Error("ceiling did not become usable ground under inverted gravity");
}
ceilingRider.controls.hasAim = true;
ceilingRider.controls.aim = { x: 0, y: 1 };
ceilingRider.controls.downHeld = true;
ceilingRider.controls.upHeld = false;
ceilingRider.controls.actions.dashHeld = false;
ceilingRider.controls.actions.punchHeld = false;
for (let frame = 0; frame < 65; frame += 1) debug.updateHumanInput(1);
if (!ceilingRider.tippyToes || ceilingRider.crouching) throw new Error("Down failed to ready ceiling super jump");
ceilingRider.controls.actions.dashHeld = true;
ceilingRider.controls.buffers.dashPressed = 0.09;
debug.updateHumanInput(1);
ceilingRider.controls.actions.dashHeld = false;
ceilingRider.controls.buffers.dashReleased = 0.09;
debug.updateHumanInput(1);
if (ceilingRider.vy < 1500 || ceilingRider.tippyJumpTimer <= 0 || ceilingRider.onGround) {
  throw new Error("ceiling super jump failed to launch downward at full tap power");
}
const reverseTapSpeed = ceilingRider.vy;
Object.assign(ceilingRider, { onGround: true, vx: 0, vy: 0, hitstop: 0 });
ceilingRider.controls.actions.dashHeld = true;
ceilingRider.controls.buffers.dashPressed = 0.09;
for (let frame = 0; frame < 110; frame += 1) debug.updateHumanInput(1);
ceilingRider.controls.actions.dashHeld = false;
ceilingRider.controls.buffers.dashReleased = 0.09;
debug.updateHumanInput(1);
if (ceilingRider.vy <= reverseTapSpeed * 1.5) throw new Error("charged reverse-gravity super jump failed to amplify launch");
const gravitySnapshot = debug.online.createSnapshot();
if (gravitySnapshot.stageGravitySign !== -1) throw new Error("online snapshot lost inverted gravity");
debug.ai.configure({ stageName: "Flat", teams: [0, 1] });
if (debug.gravity.direction !== 1) throw new Error("gravity leaked into another stage");

debug.ai.configure({ stageName: "Flat", teams: [0, 1] });
const overholder = debug.fighters[0];
overholder.controls.actions.punchHeld = true;
overholder.controls.buffers.punchPressed = 0.09;
for (let frame = 0; frame < 100; frame += 1) {debug.updateHumanInput(0);debug.shields.tick(0);}
if (!debug.isShielding(0) || overholder.punchExhausted) throw new Error("charge grace period ended too early");
for (let frame = 0; frame < 200; frame += 1) {debug.updateHumanInput(0);debug.shields.tick(0);}
if (!overholder.punchExhausted || overholder.shieldHealth !== overholder.data.shieldMax || debug.isShielding(0) || overholder.hitstun > 0) {
  throw new Error("overheld Punch failed to time out without consuming durability or causing shield-break stun");
}
if (debug.drawFace(0) !== "exhausted") throw new Error("overhold face did not show exhaustion");
overholder.controls.actions.punchHeld = false;
overholder.controls.buffers.punchReleased = 0.09;
debug.updateHumanInput(0);
if (!overholder.attack || overholder.attack.charge !== 0) throw new Error("exhausted Punch retained charge on release");
for (const state of [
  { hitstun: 0.3, stunType: "", floorTechVulnerable: 0 },
  { hitstun: 0.3, stunType: "shieldBreak" },
  { hitstun: 0, stunType: "", koScored: true, health: 0 },
]) {
  Object.assign(overholder, state);
  debug.drawFace(0);
}

debug.ai.configure({ stageName: "Uplift", teams: [0, 1] });
const dropper = debug.fighters[0];
const dropPlatform = debug.advancePlatforms(0)[1];
Object.assign(dropper, {
  x: 400, y: dropPlatform.y - dropper.data.height / 2,
  onGround: true, groundTerrainId: dropPlatform.id, onPassThroughPlatform: true,
});
dropper.controls.downHeld = true;
dropper.controls.actions.dashHeld = true;
dropper.controls.buffers.dashPressed = 0;
dropper.controls.actions.punchHeld = false;
dropper.controls.buffers.punchReleased = 0;
debug.updateHumanInput(0);
if (dropper.onGround || !dropper.platformPassHeld || dropper.platformDropTimer <= 0) {
  throw new Error("held Down + Dash failed to drop without a new Dash press");
}
Object.assign(dropper, {
  y: dropPlatform.y - dropper.data.height / 2 + 2,
  prevY: dropPlatform.y - dropper.data.height / 2 - 4,
  vx: 0, vy: 200, platformDropTimer: 0,
});
debug.resolveTerrain(0);
if (dropper.onGround) throw new Error("held Down + Dash did not keep passing through subsequent platforms");
dropper.controls.actions.dashHeld = false;
dropper.controls.downHeld = false;
debug.updateHumanInput(0);
if (dropper.platformPassHeld) throw new Error("platform pass-through did not stop on release");

debug.ai.configure({ stageName: "Flat", characters: ["defiplate", "anchor"] });
const plate = debug.fighters[0];
const plateTarget = debug.fighters[1];
plate.aim = { x: -1, y: 0 };
armTestPunch(plate, { x: 1, y: 0 });
Object.assign(plateTarget, { hitstun: 0.3, comboHits: 1, lastAttacker: plate, onGround: false });
debug.resolveHit(0, 1);
if (plateTarget.vx !== 0 || plateTarget.vy <= 0 || plate.data.bodyShape !== "trapezoid") {
  throw new Error("DefiPlate did not preserve its straight-down launch during a combo");
}

debug.ai.configure({ stageName: "Flat", characters: ["paul", "anchor"] });
const paul = debug.fighters[0];
const paulTarget = debug.fighters[1];
armTestPunch(paul);
debug.resolveHit(0, 1);
if (Math.abs(paul.vx - paulTarget.vx * 0.92) > 0.001 || Math.abs(paul.vy - paulTarget.vy * 0.92) > 0.001) {
  throw new Error("Paul failed to follow the opponent's launch vector after a clean hit");
}
if (paul.data.maxAirDashes !== 1 || paul.data.airDashScale > 0.15 || paul.data.punchWhiffLag > 0.1) {
  throw new Error("Paul's ground specialist properties are incorrect");
}

debug.ai.configure({
  stageName: "Flat", characters: ["kevin", "anchor"],
  positions: [{ x: 442, y: 300 }, { x: 470, y: 355 }],
});
const kevin = debug.fighters[0];
const kevinTarget = debug.fighters[1];
Object.assign(kevin, {
  prevX: 412, prevY: 300, vx: 900, vy: 0,
  dashDir: { x: 1, y: 0 }, dashCarryTimer: 0.3, onGround: false,
});
if (kevin.data.maxAirDashes !== 16 || !debug.isDashReboundCandidate(0, 1)) {
  throw new Error("Kevin failed to receive his 16 air dashes and generous neutral kickoff contact");
}
const preKickHealth = kevinTarget.health;
if (!debug.tryDashRebound(0, 1) || preKickHealth - kevinTarget.health !== 13) {
  throw new Error("Kevin's successful kickoff did not deal its boosted damage");
}

function fireGunMan(stageName = "Flat", character = "gunman") {
  debug.ai.configure({
    stageName, characters: [character, "anchor"],
    positions: [{ x: 300, y: 300 }, { x: 700, y: 300 }],
  });
  const gun = debug.fighters[0];
  Object.assign(gun.controls, { hasAim: true, aim: { x: 1, y: 0 }, upHeld: false, downHeld: false });
  for (const key of Object.keys(gun.controls.actions)) gun.controls.actions[key] = false;
  for (const key of Object.keys(gun.controls.buffers)) gun.controls.buffers[key] = 0;
  gun.controls.actions.punchHeld = true;
  gun.controls.buffers.punchPressed = 0.09;
  for (let i = 0; i < 12; i += 1) debug.updateHumanInput(0);
  gun.controls.actions.punchHeld = false;
  gun.controls.buffers.punchReleased = 0.09;
  debug.updateHumanInput(0);
  if (!gun.attack?.projectile) throw new Error("Gun Man did not fire a projectile on Punch release");
  debug.updateAttack(0, gun.attack.startup);
  const startingX = gun.projectiles[0].projectile.x;
  debug.updateProjectiles(0.15);
  if (gun.projectiles[0].projectile.x <= startingX + 100) throw new Error("Gun Man projectile did not travel independently");
  return gun;
}
let gun = fireGunMan();
let gunTarget = debug.fighters[1];
gunTarget.x = gun.projectiles[0].projectile.x;
const gunTargetHealth = gunTarget.health;
debug.updateProjectiles(0);
if (gunTarget.health >= gunTargetHealth || gun.projectiles.length !== 1) throw new Error("persistent projectile failed to damage and remain active on a clean hit");
const afterShotHealth = gunTarget.health;
debug.updateProjectiles(0);
if (gunTarget.health !== afterShotHealth) throw new Error("projectile dealt repeated damage within one contact generation");
gun = fireGunMan();
gunTarget = debug.fighters[1];
Object.assign(gunTarget, { x: gun.projectiles[0].projectile.x, chargingPunch: true, punchInputHeld: true });
debug.updateProjectiles(0);
if (gun.projectiles.length !== 1 || gun.projectiles[0].dir.x >= 0 || gun.punchLockout <= 0) throw new Error("shield failed to deflect persistent projectile and impose recovery");
gun = fireGunMan();
Object.assign(gun.projectiles[0].projectile, { x: 400, y: 580 });
gun.projectiles[0].dir = { x: 0, y: 1 };
debug.updateProjectiles(0.05);
if (gun.projectiles.length !== 1 || gun.projectiles[0].dir.y >= 0 || gun.whiffLag <= 0) throw new Error("Gun Man projectile failed to ricochet from solid terrain");

debug.ai.configure({ characters: ["kevin", "chungus"], stageName: "Flat" });
const shieldKevin = debug.fighters[0];
const shieldChungus = debug.fighters[1];
Object.assign(shieldChungus, { chargingPunch: true, punchInputHeld: true });
const shieldHealthBefore = shieldChungus.health;
armTestPunch(shieldKevin);
debug.resolveHit(0, 1);
if (shieldChungus.shieldHealth !== 0 || shieldChungus.stunType !== "shieldBreak" || shieldChungus.health < shieldHealthBefore - 2) {
  throw new Error("Kevin failed to obliterate a full Chungus shield while retaining low chip damage");
}

debug.ai.configure({ characters: ["goodergunman", "anchor"], stageName: "Flat" });
const gooder = debug.fighters[0];
Object.assign(gooder.controls, { hasAim: true, aim: { x: 1, y: 0 }, upHeld: false, downHeld: false });
for (const key of Object.keys(gooder.controls.actions)) gooder.controls.actions[key] = false;
for (const key of Object.keys(gooder.controls.buffers)) gooder.controls.buffers[key] = 0;
function tapAction(fighter, action) {
  fighter.controls.actions[`${action}Held`] = true;
  fighter.controls.buffers[`${action}Pressed`] = 0.09;
  debug.updateHumanInput(fighter.playerIndex);
  fighter.controls.actions[`${action}Held`] = false;
  fighter.controls.buffers[`${action}Released`] = 0.09;
  debug.updateHumanInput(fighter.playerIndex);
}
tapAction(gooder, "punch");
debug.updateAttack(0, 0.06);
if (gooder.attack || gooder.projectiles.length !== 1 || gooder.projectiles[0].projectile.speed !== 1050 * 1.25) {
  throw new Error("Gooder failed to detach a 25%-faster projectile after halved startup");
}
debug.gravity.physics(0, 0.16);
const replacedShot = gooder.projectiles[0];
tapAction(gooder, "punch");
debug.updateAttack(0, 0.06);
if (gooder.projectiles.length !== 1 || gooder.projectiles[0] === replacedShot) throw new Error("Gooder's next shot failed to replace his previous bullet");
const firstShot = gooder.projectiles[0].projectile;
const shotTarget = debug.fighters[1];
Object.assign(shotTarget, { x: firstShot.x + 10, y: firstShot.y });
debug.updateProjectiles(0.01);
if (shotTarget.health >= shotTarget.data.maxHealth) throw new Error("detached projectile failed to hit its target");
const projectileSnapshot = debug.online.createSnapshot();
projectileSnapshot.sequence = 1000;
debug.online.installSnapshot(projectileSnapshot);
if (debug.fighters[0].projectiles.some((projectile) => typeof projectile.hitTargets.add !== "function")) {
  throw new Error("online snapshot failed to restore independent projectile state");
}

debug.ai.configure({ characters: ["zomg", "anchor"], stageName: "Flat" });
const zomg = debug.fighters[0];
Object.assign(zomg.controls, { hasAim: true, aim: { x: 1, y: 0 }, upHeld: false, downHeld: false });
for (const key of Object.keys(zomg.controls.actions)) zomg.controls.actions[key] = false;
for (const key of Object.keys(zomg.controls.buffers)) zomg.controls.buffers[key] = 0;
for (let i = 0; i < 24; i += 1) tapAction(zomg, "dash");
if (zomg.airDashes <= 0 || !zomg.data.unlimitedAirDashes) throw new Error("Zomg ran out of air dashes");
for (let i = 0; i < 6; i += 1) {
  Object.assign(zomg, { attack: null, whiffLag: 0, punchLockout: 0 });
  tapAction(zomg, "punch");
}
Object.assign(zomg, { attack: null, whiffLag: 0, punchLockout: 0 });
tapAction(zomg, "punch");
if (zomg.punches !== 0 || zomg.attack) throw new Error("Zomg fired beyond its punch supply");
Object.assign(zomg, {
  x: 600, y: 604 - zomg.data.height / 2 + 2,
  prevY: 604 - zomg.data.height / 2 - 4, vx: 0, vy: 40,
  hitstun: 0, onGround: false, crouching: false,
});
debug.resolveTerrain(0);
if (zomg.punches !== 6) throw new Error("landing failed to replenish Zomg's punch supply");

for (const character of ["gunman", "goodergunman"]) {
  const wrappingGun = fireGunMan("Flat", character);
  const wrappingTarget = debug.fighters[1];
  const health = wrappingTarget.health;
  const bullet = wrappingGun.projectiles[0];
  Object.assign(bullet.projectile, { x: 1295, y: 300 });
  bullet.dir = { x: 1, y: 0 };
  debug.updateProjectiles(0.02);
  if (!wrappingGun.projectiles.length || bullet.projectile.x > 100) throw new Error(`${character} failed right-to-left bullet wrap`);
  if (wrappingTarget.health !== health) throw new Error("bullet wrap falsely swept a hit across screen center");
  Object.assign(bullet.projectile, { x: -15, y: 300 });
  bullet.dir = { x: -1, y: 0 };
  debug.updateProjectiles(0.02);
  if (bullet.projectile.x < 1100) throw new Error(`${character} failed left-to-right bullet wrap`);
}
const verticalGun = fireGunMan("Uplift");
const verticalShot = verticalGun.projectiles[0];
Object.assign(verticalShot.projectile, { x: 400, y: 780 });
verticalShot.dir = { x: 0, y: 1 };
debug.updateProjectiles(0.02);
if (!verticalGun.projectiles.length || verticalShot.projectile.y >= 0) throw new Error("bullet failed open vertical screen warp");

for (const character of ["gunman", "goodergunman"]) {
  const switchGun = fireGunMan("Flip Chamber", character);
  const switchBullet = switchGun.projectiles[0];
  Object.assign(switchBullet.projectile, { x: 580, y: 360 });
  switchBullet.dir = { x: 1, y: 0 };
  const previousGravity = debug.gravity.direction;
  // Cross the whole switch in one step to verify swept rather than endpoint contact.
  debug.updateProjectiles(0.12);
  if (debug.gravity.direction !== -previousGravity || switchGun.projectiles.length !== 0) {
    throw new Error(`${character}'s bullet failed to trigger the gravity switch and disappear`);
  }
  debug.updateProjectiles(0.01);
  if (debug.gravity.direction !== -previousGravity) throw new Error("consumed bullet triggered gravity twice");
}

debug.ai.configure({ characters: ["microusb", "anchor"], stageName: "Flat" });
const usb = debug.fighters[0];
const electrified = debug.fighters[1];
armTestPunch(usb);
debug.resolveHit(0, 1);
if (!electrified.electricLatch || usb.attack) throw new Error("Micro USB failed to attach electricity and consume the initial punch");
const electricHealth = electrified.health;
const electricInitialHits = electrified.comboHits;
for (let tick = 0; tick < 3; tick += 1) {
  electrified.hitstop = 0;
  debug.updateElectricLatches(0.17);
}
if (electrified.health >= electricHealth || electrified.comboHits !== electricInitialHits + 3 || electrified.electricLatch) {
  throw new Error("Micro USB did not deliver exactly three finite electrical follow-up hits");
}
electrified.hitstop = 0;
armTestPunch(usb);
debug.resolveHit(0, 1);
debug.breakComboOwnership(1);
const escapedHealth = electrified.health;
debug.updateElectricLatches(1);
if (electrified.electricLatch || electrified.health !== escapedHealth) throw new Error("electricity continued after combo ownership ended");

for (const stageName of ["Flat", "Perch", "Battlefield", "Split"]) {
  for (const character of ["anchor", "chungus", "microusb"]) {
    for (const side of [-1, 1]) {
      debug.ai.configure({ stageName, characters: [character, "anchor"] });
      const runner = debug.fighters[0];
      Object.assign(runner, {
        x: side < 0 ? -runner.data.width / 2 + 0.1 : 1280 + runner.data.width / 2 - 0.1,
        y: 604 - runner.data.height / 2,
        onGround: true, hitstun: 0, hitstop: 0, crouching: false,
      });
      for (let frame = 0; frame < 30; frame += 1) {
        runner.vx = side * 1100;
        debug.gravity.physics(0);
        if (!runner.onGround || Math.abs(runner.y + runner.data.height / 2 - 604) > 0.01) {
          throw new Error(`${character} slipped through ${stageName}'s ${side < 0 ? "left" : "right"} wrap seam`);
        }
      }
    }
  }
}
debug.ai.configure({ stageName: "Split", characters: ["anchor", "anchor"] });
const fallingInHole = debug.fighters[0];
Object.assign(fallingInHole, { x: 640, y: 604 - fallingInHole.data.height / 2 + 8, vy: 200 });
debug.resolveTerrain(0);
if (fallingInHole.onGround) throw new Error("wrap seam fix accidentally closed an intentional floor hole");

debug.ai.configure({ stageName: "Uplift", characters: ["anchor", "anchor"] });
const edgePlatformRider = debug.fighters[0];
const edgeSupport = debug.advancePlatforms(0)[1];
Object.assign(edgePlatformRider, {
  x: 1297, y: edgeSupport.y - edgePlatformRider.data.height / 2,
  onGround: true, groundTerrainId: edgeSupport.id, onPassThroughPlatform: true,
});
debug.gravity.physics(0);
if (!edgePlatformRider.onGround) throw new Error("rising one-way platform failed at the wrap seam");
debug.ai.configure({ stageName: "Flip Chamber", characters: ["anchor", "anchor"] });
const ceilingSwitchHitter = debug.fighters[0];
Object.assign(ceilingSwitchHitter, { x: 580, y: 360 });
armTestPunch(ceilingSwitchHitter);
debug.gravity.hitSwitch();
const ceilingEdgeRunner = debug.fighters[1];
Object.assign(ceilingEdgeRunner, {
  x: -17.9, y: 44 + ceilingEdgeRunner.data.height / 2,
  onGround: true, hitstun: 0, hitstop: 0,
});
for (let frame = 0; frame < 30; frame += 1) {
  ceilingEdgeRunner.vx = -1100;
  debug.gravity.physics(1);
  if (!ceilingEdgeRunner.onGround || Math.abs(ceilingEdgeRunner.y - ceilingEdgeRunner.data.height / 2 - 44) > 0.01) {
    throw new Error("reversed-gravity ceiling lost support at the horizontal wrap seam");
  }
}

for (const direction of [
  { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
]) {
  for (const covered of [true, false]) {
    debug.ai.configure({ stageName: "Flat", characters: ["anchor", "anchor"] });
    const striker = debug.fighters[0];
    const blocker = debug.fighters[1];
    Object.assign(blocker, { x: 640, y: 300, chargingPunch: true, punchInputHeld: true, punchAim: { ...direction } });
    Object.assign(striker, {
      x: blocker.x + direction.x * (covered ? 70 : -70),
      y: blocker.y + direction.y * (covered ? 70 : -70),
    });
    armTestPunch(striker, { x: -direction.x, y: -direction.y });
    const shieldBefore = blocker.shieldHealth;
    debug.resolveHit(0, 1);
    if (covered && (blocker.shieldHealth >= shieldBefore || blocker.hitstun > 0)) {
      throw new Error("aimed shield failed to cover a frontal punch");
    }
    if (!covered && (blocker.shieldHealth !== shieldBefore || blocker.hitstun <= 0)) {
      throw new Error("shield incorrectly protected its exposed back");
    }
  }
}
for (const shieldHealth of [68, 10]) {
  debug.ai.configure({ stageName: "Flat", characters: ["anchor", "anchor"], positions: [{ x: 448, y: 300 }, { x: 470, y: 300 }] });
  const kicker = debug.fighters[0];
  const guard = debug.fighters[1];
  Object.assign(kicker, { prevX: 418, prevY: 300, vx: 900, vy: 0, dashDir: { x: 1, y: 0 }, dashCarryTimer: 0.3, airDashes: 2 });
  Object.assign(guard, { chargingPunch: true, punchInputHeld: true, punchAim: { x: -1, y: 0 }, shieldHealth });
  const guardHealth = guard.health;
  if (!debug.tryDashRebound(0, 1)) throw new Error("shielded kickoff failed to connect");
  if (guard.shieldHealth >= shieldHealth || guard.health !== guardHealth || kicker.airDashes !== 2) {
    throw new Error("covered kickoff failed to damage shield cleanly without health chip or dash refund");
  }
  if (shieldHealth === 10 && guard.stunType !== "shieldBreak") throw new Error("kickoff did not break a depleted shield");
}

const expectedStageOrder = ["Crosswire", "Flip Chamber", "Uplift", "Perch", "High Perch", "High Perch Drift", "Battlefield", "Smash Vile", "Corners"];
if (JSON.stringify(debug.stageNames.slice(0, expectedStageOrder.length)) !== JSON.stringify(expectedStageOrder)) throw new Error("stage order did not match the requested order");
debug.ai.configure({ stageName: "Flat", characters: ["swordkun", "anchor"], positions: [{ x: 430, y: 300 }, { x: 490, y: 300 }] });
const sword = debug.fighters[0];
const swordTarget = debug.fighters[1];
armTestPunch(sword);
debug.resolveHit(0, 1);
if (swordTarget.vy <= 0 || sword.attack?.swordPhase !== 1 || sword.attack.hitTargets.size !== 0) {
  throw new Error("Sword Kun's initial downward hit failed to prepare a distinct second hitbox");
}
debug.updateAttack(0, 0.12);
debug.resolveHit(0, 1);
if (swordTarget.vy >= 0 || swordTarget.comboHits !== 2 || sword.attack) {
  throw new Error("Sword Kun's second hit failed to launch upward and consume its hitbox");
}
debug.ai.configure({ stageName: "Flat", characters: ["swordkun", "anchor"], positions: [{ x: 430, y: 300 }, { x: 490, y: 300 }] });
const blockedSword = debug.fighters[0];
Object.assign(debug.fighters[1], { chargingPunch: true, punchInputHeld: true, punchAim: { x: -1, y: 0 } });
armTestPunch(blockedSword);
debug.resolveHit(0, 1);
if (blockedSword.attack || blockedSword.punchLockout <= 0) throw new Error("blocking Sword Kun failed to stop the two-hit sequence");

debug.ai.configure({ stageName: "Flat", characters: ["runway", "anchor"] });
const runway = debug.fighters[0];
Object.assign(runway, { onGround: true, vx: 0, vy: 0, face: { x: 1, y: 0 } });
if (debug.getRunwayAnimation(0).clip !== "idle") throw new Error("Runway did not select an idle clip");
runway.vx = -400;
runway.face = { x: -1, y: 0 };
const runningFrame = debug.getRunwayAnimation(0);
if (runningFrame.clip !== "run" || runningFrame.direction !== "left") throw new Error("Runway did not select the directional run sheet");
Object.assign(runway, { groundSkidTimer: 0.3, dashDir: { x: -1, y: 0 } });
if (debug.getRunwayAnimation(0).clip !== "dash") throw new Error("Runway did not distinguish a ground dash from running");
Object.assign(runway, { onGround: false, groundSkidTimer: 0, dashCarryTimer: 0.4, dashDir: { x: 0, y: -1 } });
if (debug.getRunwayAnimation(0).clip !== "dash" || debug.getRunwayAnimation(0).direction !== "up") throw new Error("Runway's aerial dash animation did not follow its launch vector");
armTestPunch(runway, { x: 0, y: -1 });
if (debug.getRunwayAnimation(0).clip !== "attack1" || debug.getRunwayAnimation(0).direction !== "up") throw new Error("Runway's normal Punch animation did not follow its aim");
runway.attack.charge = 1;
if (debug.getRunwayAnimation(0).clip !== "attack2") throw new Error("Runway did not use the second attack clip for charged Punches");
for (const [clip, folder] of Object.entries({ idle: "IDLE", run: "RUN", attack1: "ATTACK 1", attack2: "ATTACK 2" })) {
  for (const direction of ["up", "down", "left", "right"]) {
    const png = fs.readFileSync(`assets/runway/FREE_Adventurer 2D Pixel Art/Sprites/${folder}/${clip}_${direction}.png`);
    if (png.readUInt32BE(16) !== 768 || png.readUInt32BE(20) !== 80) throw new Error(`unexpected Runway sheet size: ${clip}/${direction}`);
  }
}

for (const character of ["gunman", "goodergunman"]) {
  const firingGun = fireGunMan("Flat", character);
  const reflector = debug.fighters[1];
  const bullet = firingGun.projectiles[0];
  const remainingBeforeReflect=bullet.projectile.remainingLife??6.7;
  Object.assign(reflector, { x: bullet.projectile.x + 35, y: bullet.projectile.y, airDashes: 0, whiffLag: 0.4, punchLockout: 0.4 });
  armTestPunch(reflector, { x: -1, y: 0 });
  debug.updateProjectiles(0);
  if (bullet.reflectedOwnerId !== reflector.id || bullet.dir.x !== -1 || bullet.projectile.remainingLife !== remainingBeforeReflect*.5) {
    throw new Error(`${character}'s projectile failed punch reflection and reflected-only lifetime`);
  }
  if (reflector.attack || reflector.airDashes !== reflector.data.maxAirDashes || reflector.whiffLag !== 0 || reflector.punchLockout !== 0) {
    throw new Error("reflecting a bullet failed to grant clean-hit resource and recovery bonuses");
  }
  const shooterHealth = firingGun.health;
  debug.updateProjectiles(0.17);
  if (firingGun.health >= shooterHealth) throw new Error("reflected bullet could not damage its original shooter");
}
const expiringGun = fireGunMan();
const expiringBullet = expiringGun.projectiles[0];
expiringBullet.reflectedOwnerId = debug.fighters[1].id;
expiringBullet.projectile.remainingLife = 0.01;
debug.updateProjectiles(0.02);
if (expiringGun.projectiles.length) throw new Error("reflected projectile failed to expire");
const persistentGun = fireGunMan();
debug.fighters[1].y = 100;
for (let frame = 0; frame < 420; frame += 1) debug.updateProjectiles(1 / 60);
if (persistentGun.projectiles.length) throw new Error("unreflected Gun Man projectile failed to expire within its shorter native lifetime");

if (!process.env.DASH_PUNCH_DISABLE_ART) {
  for (const [stage, backdrop] of Object.entries(sandbox.window.DASH_PUNCH_ART.backdrops)) {
    if (!fs.existsSync(backdrop.src)) throw new Error(`missing background: ${stage}`);
    if (backdrop.pixelArt) {
      if (!backdrop.src.endsWith("/scene.png") || !fs.existsSync(backdrop.groundSrc) || !fs.existsSync(backdrop.edgeSrc)) throw new Error(`stage pack art missing: ${stage}`);
    } else if (!backdrop.src.endsWith("quiet-worlds.png") || backdrop.opacity > 0.5) throw new Error(`stage readability art policy mismatch: ${stage}`);
    const png = fs.readFileSync(backdrop.src);
    if (png.readUInt32BE(16) !== backdrop.sourceWidth || png.readUInt32BE(20) !== backdrop.sourceHeight) throw new Error(`background source dimensions mismatch: ${stage}`);
    if (backdrop.crop && (backdrop.crop.length !== 4 || backdrop.crop[2] <= 0 || backdrop.crop[3] <= 0 || backdrop.crop[0] + backdrop.crop[2] > 1 || backdrop.crop[1] + backdrop.crop[3] > 1)) throw new Error(`invalid background crop: ${stage}`);
  }
  if (!fs.existsSync("assets/backdrops/dash-punch-pixel-faceoff.png")) throw new Error("missing title artwork");
  for (const [character, assignment] of Object.entries(sandbox.window.DASH_PUNCH_ART.assignments)) {
    debug.ai.configure({ stageName: "Flat", characters: [character, "anchor"] });
    if (assignment.pixelModel) {
      if (debug.fighters[0].data.pixelModel !== assignment.pixelModel) throw new Error(`missing pixel model: ${character}`);
      debug.gravity.draw(0);
      continue;
    }
    if (debug.fighters[0].data.spriteSet !== assignment.spriteSet) throw new Error(`missing art assignment: ${character}`);
    debug.fighters[0].onGround = true;
    if (debug.getAssetAnimation(0).clip !== "idle") throw new Error(`missing idle pose: ${character}`);
    armTestPunch(debug.fighters[0]);
    const clip = debug.getAssetAnimation(0).clip;
    if (!debug.spriteAssets[assignment.spriteSet].clips[clip]) throw new Error(`missing attack fallback: ${character}`);
  }
}
for (const [name, set] of Object.entries(debug.spriteAssets)) {
  for (const [clip, sheet] of Object.entries(set.clips)) {
    const sources = sheet.sources || [sheet.src];
    for (const source of sources) {
      const png = fs.readFileSync(source);
      if (png.readUInt32BE(16) !== (sheet.width || set.width) * (sheet.sources ? 1 : sheet.columns || sheet.frames) || png.readUInt32BE(20) !== (sheet.height || set.height) * (sheet.rows || 1)) {
        throw new Error(`sprite frame layout mismatch for ${name}/${clip}`);
      }
    }
  }
}
for (const character of ["soldier", "orc", "terribleknight", "dragon"]) {
  debug.ai.configure({ stageName: "Flat", characters: [character, "anchor"] });
  const spriteFighter = debug.fighters[0];
  spriteFighter.onGround = true;
  if (debug.getAssetAnimation(0).clip !== "idle") throw new Error(`${character} failed idle animation selection`);
  armTestPunch(spriteFighter);
  if (character !== "dragon" && debug.getAssetAnimation(0).clip !== "attack1") throw new Error(`${character} failed attack animation selection`);
  spriteFighter.attack = null;
  spriteFighter.hitstun = 0.3;
  if (character !== "dragon" && debug.getAssetAnimation(0).clip !== "hurt") throw new Error(`${character} failed hurt animation selection`);
}
debug.ai.configure({ stageName: "Flat", characters: ["dragon", "dragon"] });
const weavingDragon = debug.fighters[0];
const straightDragon = debug.fighters[1];
straightDragon.data = { ...straightDragon.data, weavingDash: false };
for (const fighter of [weavingDragon, straightDragon]) Object.assign(fighter, {
  y: 280, vx: 700, vy: 0, onGround: false, dashCarryTimer: 0.5,
});
debug.gravity.physics(0);
debug.gravity.physics(1);
if (Math.abs(weavingDragon.vy - straightDragon.vy) < 1) throw new Error("dragon dash did not weave differently from a straight dash");
const fire = debug.getPunchHitbox(0, { x: 1, y: 0 }, 0);
const innerFireWidth = Math.abs(fire.points[0].y - fire.points[3].y);
const outerFireWidth = Math.abs(fire.points[1].y - fire.points[2].y);
if (!weavingDragon.data.firePunch || outerFireWidth < innerFireWidth * 2) throw new Error("dragon's fire hitbox did not form a spreading cone");

debug.ai.configure({ stageName: "Crosswire", characters: ["anchor", "anchor"] });
const crosswireSwitch = debug.fighters[0];
const crosswireFighter = debug.fighters[1];
for (const direction of [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
  Object.assign(crosswireSwitch, { x: 580, y: 360, hitstun: 0, hitstop: 0 });
  armTestPunch(crosswireSwitch);
  debug.gravity.advanceSwitchCooldown(0.6);
  debug.gravity.hitSwitch();
  if (JSON.stringify(debug.gravity.vector) !== JSON.stringify(direction)) throw new Error("Crosswire did not cycle through four gravity directions");
  Object.assign(crosswireFighter, { x: 900, y: 350, vx: 0, vy: 0, onGround: false, hitstun: 0, hitstop: 0 });
  debug.gravity.physics(1);
  if (crosswireFighter.vx * direction.x + crosswireFighter.vy * direction.y <= 0) throw new Error("Crosswire gravity failed to accelerate along its active axis");
  const halfW = crosswireFighter.data.width / 2;
  const halfH = crosswireFighter.data.height / 2;
  const landing = direction.x < 0 ? { x: 40 + halfW - 2, y: 500 }
    : direction.x > 0 ? { x: 1240 - halfW + 2, y: 200 }
    : direction.y < 0 ? { x: 600, y: 40 + halfH - 2 }
    : { x: 600, y: 680 - halfH + 2 };
  Object.assign(crosswireFighter, { ...landing, vx: direction.x * 100, vy: direction.y * 100, airDashes: 0, onGround: false });
  debug.resolveTerrain(1);
  if (!crosswireFighter.onGround || crosswireFighter.airDashes !== crosswireFighter.data.maxAirDashes) throw new Error("Crosswire's gravity-side wall did not act as ground");
}
for (const portalCase of [
  { x: -20, y: 220, expectX: 1200, expectY: 500 },
  { x: 1300, y: 500, expectX: 80, expectY: 220 },
  { x: 330, y: -80, expectX: 950, expectY: 600 },
  { x: 950, y: 800, expectX: 330, expectY: 100 },
]) {
  Object.assign(crosswireFighter, { x: portalCase.x, y: portalCase.y, vx: 0, vy: 0, onGround: false });
  debug.gravity.physics(1, 0);
  if (Math.abs(crosswireFighter.x - portalCase.expectX) > 50 || Math.abs(crosswireFighter.y - portalCase.expectY) > 50) {
    throw new Error("Crosswire failed an offset edge portal route");
  }
}

Object.assign(crosswireSwitch, { x: 580, y: 360 });
armTestPunch(crosswireSwitch);
debug.gravity.advanceSwitchCooldown(0.6);
debug.gravity.hitSwitch();
Object.assign(crosswireFighter, { x: 62, y: 500, vx: -100, vy: 0, onGround: false, attack: null, hitstop: 0 });
debug.resolveTerrain(1);
Object.assign(crosswireFighter.controls, { hasAim: true, aim: { x: 1, y: 0 }, upHeld: false, downHeld: false });
for (const key of Object.keys(crosswireFighter.controls.actions)) crosswireFighter.controls.actions[key] = false;
for (const key of Object.keys(crosswireFighter.controls.buffers)) crosswireFighter.controls.buffers[key] = 0;
for (let frame = 0; frame < 65; frame += 1) debug.updateHumanInput(1);
tapAction(crosswireFighter, "dash");
if (crosswireFighter.vx < 1500 || crosswireFighter.onGround) throw new Error("horizontal-gravity super jump did not launch away from its wall");

const newArcher = fireGunMan("Flat", "archer");
if (!newArcher.projectiles[0]?.projectile.arrow || newArcher.data.spriteSet !== (process.env.DASH_PUNCH_DISABLE_ART ? "archer" : "seekerproarcher")) throw new Error("Archer failed to release an animated arrow projectile");
if (debug.getAssetAnimation(0).clip !== "attack1") throw new Error("Archer failed to play its bow release follow-through");

debug.ai.configure({ stageName: "Flat", characters: ["anchor", "anchor"] });
const modelTestFighter = debug.fighters[0];
const modelTestData = modelTestFighter.data;
modelTestFighter.health = 43;
debug.setModelStyle(0, "block");
debug.setModelStyle(1, "pixel");
if (modelTestFighter.modelStyle !== "block" || debug.fighters[1].modelStyle !== "pixel" || modelTestFighter.health !== 43 || modelTestFighter.data !== modelTestData) {
  throw new Error("per-player model selection changed combat state or another player's selection");
}
const modelSnapshot = debug.online.createSnapshot();
if (modelSnapshot.fighters[0].modelStyle !== "block" || modelSnapshot.fighters[1].modelStyle !== "pixel") throw new Error("model preferences did not serialize for online play");
debug.ai.configure({ stageName: "Flat", characters: ["anchor", "kite"] });
const expectedAnchorArt = process.env.DASH_PUNCH_DISABLE_ART ? "knight2" : "seekerprofist";
if (debug.fighters[0].modelStyle !== "block" || debug.fighters[0].data.spriteSet !== expectedAnchorArt || debug.fighters[1].data.spriteSet !== (process.env.DASH_PUNCH_DISABLE_ART ? "demon" : "seekerpro")) throw new Error("model selections did not survive a match reset");
debug.setModelStyle(0, "pixel");

if (!process.env.DASH_PUNCH_DISABLE_ART) {
  debug.ai.configure({ stageName: "Flat", characters: ["anchor", "swordkun"] });
  if (debug.fighters[0].data.spriteSet === debug.fighters[1].data.spriteSet) throw new Error("Anchor and Sword Kun still share art");
  for (const [character, expected] of [["drop", "reaper"], ["edgebert", "seekerproedgebert"], ["kevin", "crow"]]) {
    debug.ai.configure({ stageName: "Flat", characters: [character, "anchor"] });
    if (debug.fighters[0].data.spriteSet !== expected) throw new Error(`unassigned fighter: ${character}`);
  }
  debug.ai.configure({ stageName: "Flat", characters: ["needle", "anchor"] });
  const needle = debug.fighters[0];
  needle.onGround = false;
  needle.vy = 100;
  needle.vx = 0;
  needle.dashCarryTimer = 0;
  needle.groundSkidTimer = 0;
  if (debug.getAssetAnimation(0).clip !== "fall") throw new Error("Needle falling animation not selected");
  debug.ai.configure({ stageName: "Flat", characters: ["vesper", "anchor"] });
  debug.fighters[0].wallClinging = true;
  if (debug.getAssetAnimation(0).clip !== "cling") throw new Error("Vesper wall animation not selected");
  debug.ai.configure({ stageName: "Flat", characters: ["terribleknight", "anchor"] });
  const knight = debug.fighters[0];
  knight.onGround = false;
  armTestPunch(knight);
  if (debug.getAssetAnimation(0).clip !== "attackAir") throw new Error("Knight aerial attack not selected");
}

console.log(JSON.stringify({
  tests: "passed",
  onlineInputSequence: remotePacket.sequence,
  onlineSnapshotFighters: snapshot.fighters.length,
  onlineSnapshotBytes: snapshotBytes,
  simultaneousHolds: true,
  authoritativeStateApplied: true,
  teammatesIgnored: true,
  opposingTeamTargeted: true,
  platformWrapRoute: platformRoute.routeKind,
  horizontalWrapRoute: horizontalWrapRoute.routeKind,
  comboKickoffLateralAssist: true,
  comboLift: { neutralPunchVy, comboPunchVy },
  punchBounceDecay: { firstPunchBounce, thirdPunchBounce },
  punchBounceUntechable: true,
  kickoffBounceTechable: true,
  whiffRecoveryChargeShieldAndBufferedRelease: true,
  risingPlatformsCarryAndWrapRiders: true,
  gravitySwitchAndCeilingLanding: true,
  heldPlatformDrop: true,
  punchExhaustionWithoutStun: true,
  expressiveFacesRender: true,
  newCharacterLaunchAndKickoffProperties: true,
  projectileTravelHitShieldAndTerrain: true,
}));
