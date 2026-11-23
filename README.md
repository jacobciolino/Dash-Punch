> **Public source-only snapshot.** Artwork, audio, fonts, release packages and private development history are intentionally excluded. This copy is not a standalone playable game. See [GITHUB_SOURCE.md](GITHUB_SOURCE.md).

# Dash Punch

**Dash Pong - Moving Goals** is a separate stage beside the original Dash Pong.
Mirrored goals follow a slow floor/wall/ceiling track, with a 72-second cycle and
two-second pauses. Fighters retain solid footing; the gravity-free ball scores
through the moving openings. Scoring stays continuous and the usual best-of-three
rules apply. Both Pong stages include small stone goal-side perches. See
[DASH_PONG.md](DASH_PONG.md). Online peers need matching build 86.

**November 22 touch-ups:** Chungus and Boomerangus dash 20% faster and launch
slightly higher on super jumps. Spike's frontal shield touch now deals damage
with low push and brief stun, spending durability once per separated contact.
Ember's air dash is slightly longer at the same speed, with clearer pixel fire
and short-lived ground coatings on the surfaces he dashes across.

**Wizard** is the new name for Gun Man. Three small, differently tipped wands sit
in a diagonal leather bandolier on his existing Seeker PRO cloak. His held wand,
spell bolts, three-shot magazine, 1.1-second reload and all combat values remain.
The internal `gunman` ID preserves saved choices and private online setup.

**Shockston** is the new name for Micro USB. His existing static-pattern Seeker PRO
cloak now has a restrained cyan/white pixel-electric aura in gameplay, previews
and victory celebrations. Stats, electrical follow-ups, controls and roster slot
are unchanged; the internal `microusb` ID preserves saves and online setup.

**Ball Hell / Sticky Ball:** the Dashball picker now starts with Ball Hell, Sticky
Ball, Volleyball. Both new sports have their own accurate previews and settings;
Ball Hell also has a vertical Wraparound stage and Sticky Ball a Gravity Flip stage.
Sticky Ball now awards six-point touchdowns and three-point loose-ball field
goals: first to 33, or the higher score after five minutes. Its three platforms
form a level row from roughly the 30-yard line to the opposing 30-yard line.
See [TRI_BALL.md](TRI_BALL.md), [STICKY_BALL.md](STICKY_BALL.md) and
[LANCER.md](LANCER.md) for the latest sport/fighter tuning. Core roster: 21.
Ember is the newest fighter: slow movement, four short air dashes, fleeting
destructible flames, a fire fist, fragile shield and campfire/marshmallow HUD.
Flames deal low immediate damage with no stun, burn or hit-reward refills.
See [EMBER.md](EMBER.md) for tuning and verification. Icer has slippery momentum,
four ordinary air dashes that leave
destructible falling icicles, short-lived ground ice, and a fragile shield that
shatters into icicles. See [ICER.md](ICER.md) for tuning and verification.
Booster and Lamer now have 145 HP; Lamer punches deal 7-11 damage with
988-1877.2 nominal fighter knockback (5% below Chungus), without an added arc.
His stronger sports-object force is unchanged. Successful punches restore shield
durability by 25% of effective damage, without bypassing shield-break lockout.

**Persistent shields:** Durability recovers gradually while inactive and never
refills on reactivation. Maximum hold time is independent: normal timeout fizzles
without shield-break stun. Spike has an eight-second hold and twelve-second full
durability recovery (excluding existing impact delays). See [SHIELDS.md](SHIELDS.md).
**Reflektor - The Living Mirror:** core fighter 18 uses a modified copy of the
licensed Seeker PRO Void cloth, with native-pixel silver scales. His broad
directional shield reflects relative incoming momentum, slowly pushes objects,
and trades a ten-second hold for only 36 durability. Full recovery takes fifteen
seconds, excluding impact delays. Original sprite sheets remain untouched.

**Lamer + Booster.** Core fighter #17 Lamer softly damages, strongly launches and
stacks up to three five-second suppression debuffs. Booster hits hard with very
low knockback and grants a nonstacking 2-9 second enhancement. Both walk at 86%
Anchor speed, share his dash amplitude, have two air charges, fast taps and
three-second full charges. Court statuses work on either team without damage or
knockback. Independent buffs/debuffs combine without changing base stats.
Native-grid needle/frown projections use existing Seeker PRO sprite rendering,
not projectiles or extra hitboxes. See [BOOSTER.md](BOOSTER.md) and [LAMER.md](LAMER.md).
FEATURE implementation only: no new ZIP or release build. Refresh both online
peers to use matching current builds.

**Intentional menu exits:** Hold Back / Escape for 1.6 seconds to return one
shared-menu level, then release before another exit. Each joined controller has
its own timer; a compact footer bar shows progress. Card editing Back and
View/Select remain immediate. Clickable Back buttons ask for Confirm Return.
See [MENU_BACK.md](MENU_BACK.md). Development now defaults to PATCH / FEATURE,
without a ZIP; request RELEASE explicitly. See [WORKFLOW.md](WORKFLOW.md).

**Boulder scenery:** Boulder Control, Gravity Flip Boulder Control and Total Rush
reuse High Perch Drift's Strange World background, ground/platform textures and
enhanced atmosphere. Stage previews share the same art. Existing bundled assets
are reused; geometry, scoring, physics and deterministic state are unchanged.

**Grass pitches:** Soccer, Wide Soccer, Open Arena Soccer and both Gravity Flip
Soccer variants now have cached pixel-art grass at the standard Seeker PRO
three-world-unit pixel size. Full-width turf variation avoids small repeated
tiles, and stage previews share the same artwork. Visual-only: geometry,
controls, ball physics, scoring and other sports floors remain unchanged.

**Boomerangus preview:** His roster portrait now uses the same native-pixel
scale as Chungus instead of rounding down to half size. It uses the existing
updated pixelated model, with no sprite, animation, in-game size or stats changes.

**Volleyball:** A new Court/Battle stage with closed side walls, an open sky and
a tall central net. Send the heavy-falling ball over the net; touching your
floor awards the opposing team a point. Both teams stay on their own halves.
Court disables player damage; Battle preserves combat and sports respawns.
Alternating serves, first to 11, five-minute default rounds and best-of-three
matches use the existing systems. Local 1v1-5v5 and private WebRTC 1v1.
See [VOLLEYBALL.md](VOLLEYBALL.md) for tuning and validation.

**Phantom:** The 15th core fighter joins after Boomerangus with pale-tinted,
existing Seeker PRO Void art, 99 HP and two intangible air dashes. Air Dash lasts
up to 1.25 seconds at 520-600 speed, then resolves a 28-damage nominal
materialization strike on overlapping targets. Ghosts ignore attacks and object
interactions, but terrain stays solid. Press Dash again to materialize and redirect.
Landing and confirmed materialization hits refill air dashes;
Phantom has no Kickoff and cannot buffer Punch through ghosting. Original sprite
sheets are unchanged. Both online players need the matching build. Current
Focused Phantom, browser, offline and private WebRTC checks pass. See [PHANTOM.md](PHANTOM.md) for exact values,
rules and art provenance.

**If it goes in:** Soccer and Basketball now score whenever the ball center is
inside the goal, regardless of last touch, entry direction, an earlier missed
crossing, or Spike carrying it there. Own goals award the other team. Duplicate
points remain blocked; normal resets remain. Field Goal, Golden Rush rings and
other sports keep their rules. Both online players need the updated build.

**Timer audio:** Fighting and sports rounds beep once per second from 10 to 1,
with sharper final-three-second cues and a buzzer at zero. Pause, goal resets,
overtime and rollback do not repeat the countdown. Uses offline synthesis;
round timing, scoring and sudden-death rules are unchanged.

**Basketball courts:** Basketball and Wrap Around Basketball now have small,
crisp wooden floors with staggered maple planks and subtle pixel grain. The same
cached texture appears in their stage previews. Geometry, collisions, ball
physics and scoring are unchanged; other sports keep their existing floors.

**Shield audio:** Blocked attacks now have a clearer shield thump, while Spike's
shield gives a distinctive brighter metallic ring. Sports-ball deflections and
Spike catches use the same character-aware cues. Normal hit, parry and break
sounds remain separate; shield mechanics and combat balance are unchanged.

**Title artwork:** Anchor's green spell fist now has its thumb on top, with the
same leftward punch, title composition and character designs. Gameplay art and
animations are unchanged. The original title image is retained in the project.

**Menu audio:** Quiet navigation ticks and distinct select, back, setting-change
and Ready cues work with the mouse, keyboard, shared controllers and independent
player cards. Rapid hover and simultaneous inputs are sound-limited. Uses the
existing offline synthesizer; no extra assets or gameplay changes. See
[MENU_AUDIO.md](MENU_AUDIO.md).

**Movement audio:** Dash-charge progress has rising pings and a full-charge
double chime. Light, charged and full dashes have distinct release sounds, and
super jumps have a separate rising launch. Missed melee punches have a clearer
swoosh immediately after the strike ends. Existing offline synthesis and rollback
sound deduplication are preserved. See [MOVEMENT_AUDIO.md](MOVEMENT_AUDIO.md).

**Chungus punch timing:** His base active hitbox is now 0.20 seconds rather than
5 seconds, up to 0.42 seconds with the existing full-charge bonus. The arm and
strike pose follow the shorter window. Windup, recovery, whiff penalty, reach,
damage, knockback and other fighters remain unchanged.

**Larger game view:** During play, the arena now expands to fit the browser
instead of stopping at 1,180 pixels wide. Outer padding is reduced to six pixels;
the round HUD and Pause button stay visible. The full 16:9 image and crisp pixel
scaling remain, with no changes to the camera or gameplay. Menus are unchanged.

**Floatier sports balls:** Quidditch/Golden Rush and target balls have about 14%
less gravity, 15% more rebound-speed retention and lower rolling friction for
longer passes and ricochets. Includes Four-Way Golden Rush, Target Break, all
Target Charge stages and Total Rush's small balls. Fighters, boulders, golden
targets, Soccer and Basketball are unchanged. See
[FLOATY_SPORTS_BALLS.md](FLOATY_SPORTS_BALLS.md).

**Wide courts and Whirlwell:** Separate Soccer and Field Goal stages are 1.75x
as wide (4,480 units), with closed sides and unchanged goal dimensions and ball
physics. Whirlwell is a core Versus arena with a slowly rotating stone wheel,
wrapping sides, an open sky, and a Chungus-sized bottom-to-top return pit.
See [WIDE_COURTS_WHIRLWELL.md](WIDE_COURTS_WHIRLWELL.md).

**Four-way Golden Rush:** A new Battle stage beside Golden Rush cycles gravity
Down, Left, Up and Right when the central switch is hit. Walk and jump on all
four solid boundaries with normal controls. Scoring balls and stunned golden
targets share gravity; the camera stays upright. Regular Golden Rush is
unchanged. See [GRAVITY_GOLDEN_RUSH.md](GRAVITY_GOLDEN_RUSH.md).

**Own goals repaired:** Soccer and Basketball now register contact-driven entries,
including shield deflections and walking dribbles into your own goal. The opponent
gets the point regardless of last touch; captured balls, solid geometry and
stationary overlap repair still cannot score. Both online players need the update.

**Dash controls and Boomerangus:** Standard defaults now use L1/LB, bottom face,
R2/RT and top face for Dash; R1/RB, left face, L2/LT and right face for Punch.
Untouched saved defaults upgrade automatically; custom remaps are retained.
Boomerangus has roughly doubled dash travel while keeping his slow walking,
low jump and heavyweight weapon. See [DASH_CONTROLS.md](DASH_CONTROLS.md).

**Full roster restored:** Character selection shows all 15 core fighters,
including Phantom appended after Boomerangus. Hover for an animated preview,
click a player label to choose
their seat, then click a fighter. Controller cursors, teams and explicit Ready
remain independent. See [ROSTER_GRID.md](ROSTER_GRID.md).

**Sports stage guides:** Every current Dashball stage has a full-stage preview
drawn with the actual arena/objective painters, plus concise Objective, Twist
and Scoring details. Highlight to browse, confirm to select. All three Sandbag
rulesets also have a preview and guide on their existing setup screen. Shared
controllers, independent player cards, settings and gameplay are preserved.
Previews work offline and update from current definitions without maintaining
separate thumbnail artwork. See [SPORTS_STAGE_PREVIEWS.md](SPORTS_STAGE_PREVIEWS.md).

**Lightweight startup:** `npm start` serves the latest core-only release after
`npm run build`. Showcase and experimental content are excluded; Classic graphics
is the default, with Enhanced available in Settings. The full development
checkout remains intact (`DASH_PUNCH_DEVELOPMENT=1 npm start` serves source).

**Current sports update:** All PvP sports default to 50% HP, 15-second respawns
(10/15/20 choices), and two-second protection ending on offense. Basketball has
its own ball sprite and a pass-through moving platform; brief punches now
intercept moving balls within the physics steps. Soccer uses the supplied SFX,
Target Break/Golden Rush use muted Orc arena art, and Chungus has a brown attached
streaming fist. `npm run build` now exports core-only by default. See
[SPORTS_POLISH.md](SPORTS_POLISH.md).

**Sandbag Showdown:** **Play > Sandbag Showdown** opens Damage Race (divided,
no PvP), Damage Brawl (assigned bags plus combat), or Sandbag Scramble (one shared
movable bag). Choose 1v1-5v5, time and PvP settings, then ready up and select
**Start Showdown**. Most bag damage wins; ties enter next-hit sudden death.
Local humans/CPUs and private online 1v1 use the existing two-button controls.
See [SANDBAG_SHOWDOWN.md](SANDBAG_SHOWDOWN.md) for tuning, tests and limitations.

**Edgebert:** One Punch release now runs an opener/follow-up/finisher sequence using
the authored Seeker PRO combo. Reach is shorter; the first two strikes hold
pressure and the third launches harder. Dashes and shield durability are unchanged.
See [EDGEBERT.md](EDGEBERT.md) for controls, exact tuning and tests.

**Dashball:** **Play > Dashball** opens Court or Battle rules. After choosing
fighters, use its separate stage picker: **Soccer**, **Basketball**,
**Wrap Around Basketball** (open top and wrapping sides), **Target Break**, or
**Golden Rush**, **Gravity Flip Soccer**, **Boulder Control**, or
**Gravity Flip Boulder Control**, or **Total Rush**.
Local teams support 1v1 through 5v5 with humans and CPUs;
private online supports 1v1. Same direction/Dash/Punch controls, with a soccer
ball, team scores, goal resets, optional overtime and Battle respawns. See
[DASHBALL.md](DASHBALL.md) for rules, tuning, tests and known limitations.

**Gravity Flip Soccer:** Punch the original central Flip switch to reverse gravity
without a cooldown between distinct hits. Fighters and the ball retain momentum;
smaller goals travel between floor and ceiling and remain live while moving.
Court/Battle, local 1v1-5v5 and private online 1v1 are supported. See
[GRAVITY_SOCCER.md](GRAVITY_SOCCER.md).

**Boulder Control:** Battle-only territory sport. Use charged hits, combos and
Kickoffs to keep a giant heavy boulder in your own team zone: 1 point/second, or
2 above the elevated platform. Blue left, Red right, wrapping sides, first to
100. Local 1v1-5v5 and existing private online 1v1. See
[BOULDER_CONTROL.md](BOULDER_CONTROL.md).

**Gravity Flip Boulder Control:** Battle-only, first to 100. The shared physical
gravity switch moves both scoring windows, their bonus platforms and the neutral
perch continuously between floor and ceiling. Scoring stays live in transit;
the bonus side faces away from current gravity. Heavy-ball momentum, wrapping,
combat and respawns remain shared. Local 1v1-5v5; private online 1v1. See
[GRAVITY_BOULDER.md](GRAVITY_BOULDER.md) for geometry, tuning and verification.

**Total Rush:** Three objectives, one scoreboard. Battle-only, first to 300:
boulder territory earns 1/2 points per second, opposing middle/high rings earn
5/10, and the 144-HP snitch awards 30 before a 45-second respawn. Three small
balls collide with the giant boulder. Combat and friendly fire stay on; KOs
award zero points. Local 1v1-5v5; private online 1v1. See
[TOTAL_RUSH.md](TOTAL_RUSH.md).

**Team identification:** Pixel-silhouette outlines and subtle glow follow the
actual fighter animation in team modes. Red-orange and electric blue come from
the assigned team, not character colors. **Settings > Team Outlines / Team Glow**
are separate, automatically saved local preferences, on by default. FFA and
neutral sports artwork are unchanged. See [TEAM_VISUALS.md](TEAM_VISUALS.md).

**Target Break:** Defend the six targets on your back wall and smash all six
opposing targets with the ball. Court keeps fighters on their own halves; Battle
adds normal combat and respawns. The ball stays in play after each break. A tied
timer means sudden death. See [TARGET_BREAK.md](TARGET_BREAK.md) for details.

**Golden Rush:** Three shiny red balls score through 1/3/5-point low/middle/high rings,
while a high-roaming 48-HP golden target awards its final hitter's team 15 points.
Sides wrap; the ceiling stays closed. First to 100 wins.
Battle combat and friendly fire are always on, with 50% health and 15-second
default respawns. Choose it in Dashball's stage picker; **Golden Rush Settings**
adjusts balls, score, rewards, respawns and an optional timer. See
[GOLDEN_RUSH.md](GOLDEN_RUSH.md).

Core stages support **Settings > Graphics > Enhanced / Classic**. Enhanced adds
cached layered depth and restrained stage lighting; Classic keeps the previous
lightweight backdrops. The choice saves automatically and does not change combat
or require the other online player to use the same setting.

A tiny browser prototype for the dash-and-punch platform fighter idea.

**New core team arenas:** Castle Dungeon (closed) and Enchanted Forest (open).
Both fit ten local fighters, share five floating platforms and a continuous
floor, and use a fixed wide camera with a two-row team HUD. Select either stage
and choose **Set Up 5v5** to keep existing human seats and fill spare seats with
CPUs in two teams. Team Attack keeps your current setting. Online remains 1v1.
See [TEAM_ARENAS.md](TEAM_ARENAS.md) for screenshots, tests and performance results.

**Character updates:** [Orbit](ORBIT.md) has a longer, slower steerable air arc and
stronger combo hitstun with lower Punch damage. [DefiPlate](DEFIPLATE.md) joins
core with a standalone pixel plate and an attack-only exposed barbell sleeve.
Both peers need the current build for online play.

Open `index.html` in a browser to play offline. Choose **Play > Local > Fighters > Stage > Fight**, or **Play > Online 1v1** for a room with a friend. Local fighters ready up in the lobby; player options hold CPU control, teams and model choice. Extras contains Stage Builder, Controls and Quick Playtest. See [MENU_UX.md](MENU_UX.md) for the updated flow and controller behavior.

The fighters are simple rectangular hurtboxes on purpose, so the prototype stays focused on feel and readable collisions.

## Online 1v1

Online play is a private two-human rollback playtest. Both browsers run combat locally at a fixed 60 Hz, predict missing opponent inputs, and restore/replay up to eight frames when predictions differ. Gameplay packets contain inputs, not fighter positions. Direct WebRTC is preferred; the signaling server can relay the same input packets if a direct connection fails. See [ROLLBACK.md](ROLLBACK.md) for architecture, validation, and known limits.

### Run locally

1. Install Node.js 20 or newer. No third-party packages are required.
2. In this folder, run `npm start`.
3. Open `http://localhost:8080` rather than opening `index.html` directly.
4. For a quick same-computer check, open a second browser tab. In the first tab choose **Online 1v1 > Host Match**. Enter the displayed code in the second tab and choose **Join Match**.

Offline play still works by opening `index.html` directly. Hosting or joining an online room requires the server-backed URL.

### Play across a local network

Keep `npm start` running and open the game using the host computer's local network address, such as `http://192.168.1.50:8080`, on both computers. Allow incoming connections if the operating system asks. Some browsers restrict WebRTC or controller features on non-secure LAN pages, so the public HTTPS deployment below is the more dependable friend-test setup.

### Put it online

The repository includes `render.yaml` for a small Render web service:

1. Put this folder in a Git repository hosted on GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint and select that repository. The included blueprint installs dependencies, starts the game server, and exposes `/health` for health checks.
3. Open the HTTPS address Render gives you and wait for the game to load.
4. Choose **Online 1v1 > Host Match**, then **Copy Invitation**.
5. Send that link to a friend. They open it, connect a controller if desired, and choose **Join Match**.
6. Each player chooses their fighter and presses **Ready**. The host then chooses **Start Fight**. Both browsers verify the build, stage definition, and initial-state hash before play begins.

The Node server must remain running while rooms are active. A sleeping free host may take roughly a minute to wake on the first visit. The WebSocket relay improves connection success but adds server round-trip latency when WebRTC cannot connect directly.

### Online behavior and limits

- Online mode is two-human 1v1 only. Each player can choose any existing fighter; Flat is the initial online stage.
- Both peers simulate the existing movement, combat, damage, KO, and scoring rules.
- Local input has no intentional delay. Inputs use 4096 angular directions and recent-frame redundancy.
- Pause, reset, rematch, connection timeout, and return-to-menu requests are synchronized.
- Prediction stops explicitly if eight frames are still unconfirmed. Severe loss or latency can therefore stall a match; this is not hidden by position smoothing. Hash mismatches stop the match and require a rematch.
- Append `?netDebug=1` to the game URL for network metrics and latency/jitter/loss controls. Latency presets are one-way delay, not round-trip ping.
- `npm test` checks existing combat, signaling, independent deterministic simulations, rollback restoration, and simulated packet loss. `npm run test:network` uses a real localhost port. `npm run test:browser` additionally requires Playwright and a browser, and tests actual local WebRTC.
- Two isolated Chrome contexts have been tested on this machine. Two physical computers and different home networks still need validation before calling this reliable internet netplay.

## Controls

Keyboard and controllers are both first-class inputs. Normal setup now happens through the menus so the battle screen can stay clean.

Player 1:

- Aim: `WASD`
- Charge/release dash: `Shift`
- Charge/release punch: `F`

Player 2:

- Aim: arrow keys
- Charge/release dash: `Enter`
- Charge/release punch: `/`

Shared:

- Pause/menu: `Esc` or `M`
- Reset: `R`
- Debug shortcuts still work: `T` changes stage, `P` changes player count, `O` changes team mode, `H` toggles team attack, `U`/`Y` toggle P1/P2 AI, and number keys cycle characters.

Default controller:

- Aim: left stick, right stick, or D-pad; hat-axis D-pads on Xbox/Switch-style controllers are supported too
- Dash: South face button, North face button, left bumper, or right bumper
- Punch: East face button, West face button/Square, left trigger, or right trigger
- Pause/menu: Start/Options/Plus/Menu
- Menu navigation: left stick, right stick, or D-pad to move; South face/Cross/A to confirm; East face/Circle/B or Share/Select/Minus to go back
- Quick playtest reset: Share/Select/View/Minus or PS4 touchpad click
- Controller labels adapt for PlayStation, Xbox, Nintendo/Switch, and generic pads where the browser reports enough identity.
- Button aliases are merged, so releasing one Dash/Punch binding while another is still held does not release the action.
- Extra controllers are assigned to active player slots when you raise the player count.
- If a controller is plugged in but not shown yet, press any controller button once to wake the browser's gamepad connection.
- Battle view hides the old debug/remap rows so the match is easier to read.

## Developer Stage Builder

Choose **Stage Builder** directly from the title/main menu to edit the currently selected built-in stage or start a blank one. Stage Select also keeps a shortcut for editing the highlighted arena.

- Tools: Select, Solid Rectangle, Pass-Through Platform, Moving Platform, Vertical Wrap Zone, Spawn P1-P10, and Delete.
- Drag empty space to create geometry; select and drag objects to move them; use the corner/edge handles to resize them.
- Exact object values and stage properties are editable in the inspector. Grid, snap, labels, bounds, and spawn overlays can be toggled independently.
- `Cmd/Ctrl+Z` undoes; `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redoes.
- Local Save/Save As uses browser storage. Import/Export supports editor JSON, downloadable JSON, and runtime stage JSON.
- **Add to Stage Select** saves and promotes the custom stage into the normal stage reel, including after a reload.
- **Playtest Stage** launches the exact unsaved in-memory geometry. Pause the match and choose **Return to Stage Builder** to continue editing without losing it.
- Custom stages reuse the normal `terrain`, `oneway`, `move`, `spawns`, wrap, and camera runtime fields; built-in collision code is unchanged.

## Current Mechanics

- No separate run command and no airborne walk. Sustained grounded directional
  movement starts running at 2.8 seconds and accelerates for another 0.7 seconds.
  Maximum speed is 1.65 times the fighter's walk speed, capped below 85% of their
  uncharged ground dash. Existing character, enhancement and carrier modifiers apply.
- Release, reversal, crouch, dash, airborne movement and combat interruptions reset
  the run-up. Running jumps preserve actual horizontal momentum, not a stored boost.
- Holding down while grounded crouches and stops locomotion immediately, including
  ground-dash translation. Committed attacks/recovery must finish before crouch is
  accepted; braking does not cancel combat commitments or restore resources.
- Blue has a basic sparring AI by default, and red can be toggled to AI too.
- 1v1 is the default, while menus can open the game up to 10-player chaos.
- Extra chaos slots start as AI so you can test a crowd alone, and each slot can be toggled to human from character select or settings.
- Team mode supports FFA, clean pairs like 2v2 through 2v2v2v2v2, 2-team, and 4-team setups.
- Team Attack is on by default, so teammates can still hit, clash, kickoff, and KO each other.
- If Team Attack is toggled off, same-team offensive interactions are ignored while normal body collision remains.
- AI never intentionally targets or defensively retaliates against teammates, even with Team Attack on, so friendly fire comes from scrambles rather than deliberate betrayal.
- In chaos matches, KOs do not freeze the whole round until only one player/team remains.
- KO'd bodies can ragdoll for about 11 seconds, then fade out over about 3 seconds and stop colliding.
- AI defensive reads are intentionally imperfect so combos can develop before the computer finds an escape.
- Fifteen core fighters: Anchor, Orbit, Spike, Rain, Edgebert, Reverso, Whipado, Shockston, Wizard, Archer, Kite, Chungus, DefiPlate, Boomerangus, and Phantom. Additional experimental fighters remain in the development checkout, not the core release.
- Max health is globally scaled up so fights last longer without making individual hits feel toothless.
- Ground dashes are always available.
- Air dashes are limited per character.
- Phantom has two ghost air dashes, a materialization strike and no Kickoff. A fresh Dash press materializes and redirects using another charge. Confirmed materialization hits restore normal punch resources before the next dash spends its charge; misses refund nothing. Walls, ordinary punches, passive banking and mercy dashes do not refill him. Punch cannot buffer through ghosting. See [PHANTOM.md](PHANTOM.md).
- Quick dash and punch taps release immediately without entering charge, hover, or shield.
- Holding dash or punch past the tap grace threshold begins charging.
- Press dash while holding down/crouch on a pass-through platform to drop through it instead of dashing.
- Holding mostly up on the ground for one second enters tippy-toes stance, even while dash is held/charging; releasing dash while the stance is still active performs a huge vertical super jump, with charged dash launching even higher.
- Getting hit strips your remaining air dashes until you land, fresh-wall cling, or earn a mercy dash.
- Mercy dash now requires crossing a vertical wrap while dashless before the weak recovery dash appears.
- High-air-dash flyers wait longer after the wrap and get a weaker mercy dash.
- Red currently has 4 air dashes.
- Holding punch creates an aimed force barrier that follows the smoothed Punch vector. Its 110-degree arc covers only the aimed side; exposed sides take normal hits. Covered Punches cause chip damage and lighter knockback, and bullets can be intercepted at the barrier.
- Covered Dash Rebound Kickoffs drain 20-30 shield durability, bleed stored charge, and can break depleted shields. They cause no health chip and grant no air-dash refund when blocked.
- Shield damage bleeds some stored punch charge so blocking pressure cannot bank a free max-charge punish.
- Releasing punch from shield has slower startup, keeping shield as a block/charge choice instead of a neutral parry trap.
- Parry is now a combo-defense command only; neutral defense is handled by shields, clashes, spacing, and movement.
- Holding dash while shielding charges dash; firing the dash drops shield, preserves punch charge, and can re-shield after a short reactivation delay if punch stays held.
- Double-tapping down after shield has been held for a few frames performs a short spot dodge that always settles into crouch; holding down while charging punch only aims downward.
- Successful spot dodges JUKED the attacker and recover quickly; empty spot dodges JUKED the defender and are punishable.
- Shields can break after enough blocked hits, putting the defender in a distinct shield-break stun.
- Charging dash shows a directional preview arrow.
- Charged Punch aim stays fully 360-degree on analog sticks, averages the final 100 ms of input to reduce release jitter, and displays its projected hitbox while charging.
- Live directional input can continue rotating a released Punch during its active frames. The movement is turn-rate limited, with slower steering for unusually persistent attacks such as Chungus and Whipado.
- Punch collision has a target-agnostic 10-degree forgiveness fan around the chosen strike direction; character launch curves and live launch influence remain separate from that strike direction.
- The forgiveness fan is one continuous, single-hit volume; a confirmed Punch consumes it immediately and cannot deal multihit damage.
- Getting hit while charging dash causes extra hitstun, especially at full charge.
- Air dash charge starts with a brief hover/read window, then gravity returns so it cannot stall forever.
- Charged punches reach farther, stay active longer, and use a character-tunable hitstun multiplier that rises with charge.
- You can dash while a punch hitbox is out, including through punch recovery.
- Punch whiff lag now blocks new punches, not movement.
- Holding Punch during whiff recovery charges and shields; releasing during recovery queues that charged Punch to fire once the remaining end lag expires.
- After full charge plus a 1.5-second grace period, continued Punch holding drains shield over about two seconds. Exhaustion drops shield and removes stored charge without shield-break stun; releasing then throws a normal uncharged Punch.
- Hold Down + Dash to drop through and continue passing through one-way platforms without repeated button presses.
- Fighters have animated faces for idle blinks, focused attacks, strained shields, exhaustion, happy recoveries, hurt, dizzy stuns, and KOs.
- Shield blocks consume the incoming punch hitbox and put the attacker into normal punch end lag.
- Aim during impact to steer launch direction.
- Directional influence during hitstun lets defenders bend launches slightly, especially after speed decays, and grows modestly deeper into a combo.
- Each character has a different natural launch curve.
- Airborne hitstun lowers gravity and slows movement for juggle setups.
- A Punch that confirms on genuine combo hitstun adds upward lift and a small pull toward the attacker without replacing the character's natural launch curve. Ground confirms reliably pop the defender into an aerial route, while downward attacks can still drive into a surface bounce.
- Punch-driven floor, wall, and ceiling bounces keep more speed and briefly preserve hitstun for follow-ups. These forced combo bounces cannot be teched, and repeated bounces lose energy.
- Kickoff knockdowns can be teched on floors, solid walls, and ceilings with a forgiving 280 ms pre-impact Dash buffer; ordinary Punch hitstun is intentionally not techable.
- Floor techs use Dash plus down: mostly down gives a fast neutral tech, while down-left or down-right performs a 190 px invulnerable tech roll with slightly longer recovery.
- Wall techs redirect away from the wall, ceiling techs redirect downward, and AI fighters imperfectly mix all three surface-tech families.
- Successful surface techs prevent impact damage and immediately end the current combo; unteched Kickoffs rebound with substantial speed, while missed hard impacts deal speed-scaled terrain damage and preserve combo ownership.
- Holding dash plus down near the floor gives a small tech assist, while weak terrain touches below the impact threshold do not deal bonus damage.
- Active air dashes can rebound only when current momentum and remaining dash travel project through the opponent and the attacker's centered inner-body contact volume reaches the defender. During genuine combo hitstun or knockdown, the contact corridor gains lateral forgiveness so human players can chase DI without needing a dead-center vector. Kickoffs deal low damage, blast the attacker far away at above-dash speed, open frame advantage, and add exactly one air dash up to the character's maximum.
- Kickoff speed requirements scale down for naturally slower characters, and remaining dash travel only needs to project the attacker into the defender's contact volume rather than through their center. Braking, fizzling, and grazing contacts still fall through to the normal soft body bump.
- An actually active, overlapping Punch hitbox has priority over Dash Rebound; merely holding or buffering Punch does not invisibly disable Kickoff.
- Holding Dash in the air still brakes/stalls with zero air dashes, but cannot create dash velocity, parry frames, or resources.
- After a Dash Rebound kickoff, the defender gets a short boosted-DI window so they can strongly alter the route before the attacker chases.
- Dash Rebound kickoff gives only a small, slow dash-escape and punch-parry recharge nudge for the next chase without instantly restoring them or stripping air dashes; direct punches still strip air dashes.
- Two high-speed airborne dash collisions can create a mutual Dash Rebound with symmetric recoil.
- During each combo, the defender gets dash escape and punch-parry resources that must still be aimed/timed correctly.
- Spent dash escape and punch parry meters refill only during sustained enemy combo pressure, with character-specific rates.
- Ending a combo in the air no longer restores either defense option. Partial meter progress persists through an airborne re-catch, and both options refill only after the defender settles on solid ground.
- Lost air dashes can recharge into a bank during sustained hitstun, then become live when hitstun ends.
- Defensive resources, refill progress, banked air dashes, and vulnerable states are shown on the fighter body and in the HUD.
- Input is routed through per-player abstract input profiles with keyboard/controller aliases, toggleable aim sources, radial analog deadzone, digital 8-way aim, short action buffers, and remapping hooks.
- The remap panel expands to all active players, so P3-P10 can use controllers, keyboard presets, or custom remaps.
- The prototype now has centralized `animationState` hooks for idle, walk, crouch, tippyToes, dash, dashCharge, punch, punchCharge, shield, shieldReleaseWhiff, shieldParrySuccess, shieldParried, dashFromShield, shieldReactivation, spotDodge, spotDodgeSuccess, spotDodgeMiss, juked, parrySuccess, parryMiss, dashEscapeSuccess, dashEscapeMiss, hitstun, stun, shieldBreak, comboEscape, floorTech, floorTechRoll, wallTech, ceilingTech, floorTechMiss, wallCling, vulnerable, knockdown, knockdownTech, dashReboundSuccess, dashReboundMiss, mutualDashRebound, and koLaunch.
- Placeholder audio is event-driven and generated in-browser, with punch charge/combo bands, dash charge/sequence variation, wall-launch accents, parry/miss cues, shield charge bleed/release/parry hooks, distinct surface-tech cues, dash rebound, and KO hooks.
- Add `?debugHitboxes=1` to the game URL for a tuning overlay showing hurtboxes, defender rebound zones, centered Kickoff contact volumes, and the active Punch forgiveness fan.
- Air dashes are softer than ground dashes.
- Dashes inherit momentum, carry farther, and reverse more gradually when aimed against current speed.
- Air dashes can be steered with directional input for a short time after release, with less control at high speed.
- Dashless free fall has weak speed-scaled steering and braking.
- Characters have terminal velocity so vertical wraps cannot build infinite speed.
- Hold your aim into a wall to cling to it; fresh clings pause for about 2.5-3.5 seconds by character, then slide very slowly.
- Fresh wall cling refills air dashes and primes the next dash away from the wall with a strong boost.
- Reusing the same wall before touching ground or another wall gives no refill or boost and increases slide speed.
- Terrain does not bounce you unless you are in hitstun.
- Edge-touching terrain continues through the horizontal wrap margin for collision and surface-tech prediction, preventing fighters from falling beside floor ends during a screen wrap. Intentional holes and interior platform edges remain open.
- Uplift has three screen-wide pass-through platforms rising steadily at 65 pixels per second. Platforms loop from the top to the bottom with standing riders, with a fixed camera and screen wrap.
- Flip Chamber wraps horizontally between a solid floor and ceiling. Punch the central arrow switch to reverse everyone's gravity; the ceiling becomes usable ground and restores air dashes. Switch hits grant clean-hit air-dash refills and recovery cancels, and the switch has a brief cooldown.
- Super-jump stance follows gravity: hold Up on the floor or Down on the ceiling, then release Dash to launch away from that surface. Tap/charged power and the dash preview follow the reversed launch direction.
- Landing from air carries momentum into a short skid.
- Punches that miss have whiff lag.
- Clean body hits refill air dashes, end the active hitbox, heavily reduce attacker hitstop, and cancel punch recovery so attackers can act again immediately.
- Shield blocks do not grant that clean-hit cancel; blocked punches keep normal recovery.
- Grounded punches and grounded dashes now expose character-tunable leverage multipliers for damage, launch, and dash power.
- Fighters visually tumble when hit or stunned by a defensive read.
- Side boundaries wrap around.
- Sixteen built-in stages, plus locally promoted Stage Builder arenas: Split, Flat, Perch, High Perch, Battlefield, Smash Vile, Castle 64, Sling, Block, Vault, Colossus, Cutline, Clamp, Towerfall, Cutbox, and Corners.
- Perch has a middle platform that can be passed through from below.
- High Perch adds a second platform above Perch in a taller no-ceiling space, with a stage-specific camera that follows upward and zooms out when fighters spread vertically.
- Battlefield has three pass-through platforms in a classic two-low, one-high arrangement.
- Smash Vile has a sky island, tight wrap zones, and a slow horizontal moving platform.
- Castle 64 has a broad castle rooftop, side towers, center bridge, and three pass-through battlement platforms inspired by old platform-fighter castle energy.
- Sling is taller and has two solid floating boxes for wall slide routes.
- Block has a large solid middle block over a floor hole.
- Vault is a huge walled arena with one high pass-through platform.
- Colossus is an extra-large walled arena with eight explicit spawns, multiple platform tiers, and enough space for full-room chaos.
- Cutline is a boxed, fixed-camera, zoomed-out arena with a central vertical cutout, a long horizontal moving platform, and diagonal corner cutouts.
- Clamp is a simple floor-and-ceiling wall stage with one pillar rising from the floor and one dropping from the ceiling.
- Towerfall is a tall vertical wrap arena with staggered platforms for falling routes and wall-launch scrambles.
- Cutbox is a small enclosed lane grid with two horizontal and two vertical cutout paths.
- Corners has a middle platform, four corner arena pieces, and tight wrap zones on the sides, top, and bottom.
- Floor holes wrap vertically when a stage has them.
- Punch hitboxes can clash; both active hitboxes are consumed immediately, while aggression/right-of-way gives a small advantage to the more committed attacker.
- Repeated high-aggression clashes can escalate into a power struggle break.
- Punch-parry is available during true combo hitstun and knockdown combo pressure, not against the first neutral opener.
- Punch Parries inflict the long attacker stun. Dash Escapes only cancel the incoming action and apply a brief 120 ms interruption, while preserving 78% of attacker momentum so a read can continue the chase.
- Dash escapes only work during true combo pressure; punch-parry works during true combo hitstun or knockdown combo pressure. Neither works during shield break, shield-parried, missed tech, JUKED, KO launch, or other punishment stuns.
- During combo hitstun, one correctly aimed dash can break a combo. Its forgiveness is weighted heavily before the next Punch lands, with only a very small post-impact grace period.
- A successful Dash Escape immediately restores one usable air dash, capped by the defender&#39;s character maximum, so the defender can route their escape instead of only drifting away.
- A correctly aimed pre-hit Dash Escape avoids that incoming Punch; committing too early or choosing the wrong direction spends the escape and leaves the attacker&#39;s combo intact.
- Missing a dash escape or punch-parry read extends combo ownership briefly so the attacker can capitalize on the bait.
- Active punch hitboxes have explicit priority over Dash Rebound attempts when they intersect on the same frame.
- Wall slide is intentionally very slow.
- Chungus is huge, brown, slow, and has a very long downward punch.
- Whipado is tiny, fast, has 8 air dashes, and launches opponents high upward-diagonal.
- Edgebert has giant dashes, a long skinny poke, low knockback, high hitstun, and bad shield durability.
- Broadside has a short but very wide punch that nudges opponents forward, and its successful kickoffs slow it down instead of blasting it away.
- Rain has 10 huge air dashes, a standard punch, and a launch curve that sends opponents moderately upward and slightly inward.
- Reverso launches opponents in the exact opposite direction of the punch vector.
- Characters have different gravity, health, dash count, dash speed, punch timing, knockback, hitstun, launch curves, and wall slide.
- DefiPlate uses a trapezoidal plate silhouette with two slots and a center hole; every Punch launch goes straight down, even during combo lift.
- Punchin Pro Paul Poop has explosive ground dashes, a single very weak air dash, fast punches, light whiff recovery, and clean-hit momentum that follows the opponent's launch vector. Blocks do not grant follow-through.
- Kick Off Kevin has Rain-like movement, 16 air dashes, 3-damage high-hitstun Punches, extra lateral Kickoff forgiveness, and 13-damage Kickoffs (the normal value is 4). Properly aimed shields block his Kickoffs but lose durability.
- Wizard fires an aimed energy projectile instead of a melee Punch. Charge increases shot speed, size, and power. Shots use stage horizontal/vertical warp routes, stop at solid terrain, and use existing shield, clash, combo-defense, and successful-hit cancel rules. Each shooter's next bullet replaces their previous one; bullets otherwise stay live until contact or the round ends.
- Kevin's Punch deals at least 160 shield damage, shattering even Chungus's full shield in one hit while keeping normal health damage and chip low.
- Gooder Gun Man alternates twin guns, halves Wizard's startup, recovery, whiff lag, and charge time, and fires bullets 25% faster. Both gun characters can fire again after recovery while a previous shot travels; the new shot makes the old one fizzle.
- Zomg has unlimited air dashes and six Punches per landing. The HUD pips show Punches; whiffs and blocked Punches still spend one. Empty Punches cannot fire, while charge/shield remains available. Landing reloads the supply; hits and wall clings do not.
- Kickoffs allow wider approach angles and an extra 18 pixels of lateral contact forgiveness in neutral, plus the existing combo and character-specific allowances. Active overlapping Punches still take priority.
- Shockston attaches three electrical follow-up hits on a clean Punch, spaced 160 ms apart outside hitstop. Sparks follow the defender; ticks have low damage and knockback, use normal combo defense, and stop when combo ownership breaks. Fresh hits refresh rather than stack the effect.
- Sword Kun swings a visible sword twice per Punch: a softer downward launch first, followed by a distinct upward-launching hitbox. Shields and clashes stop the sequence, and the second successful hit consumes its hitbox normally.
- Runway uses the supplied FREE_Adventurer pixel sprites: eight-frame directional idle/run animations and two attack clips for normal/charged Punches, including follow-through after a clean hit. The pack has no dedicated hurt/jump frames; existing pose and tumble effects provide those states. Assets and the original license are included under `assets/runway/`.
- Soldier and Orc use the newest supplied Tiny RPG v2.0 sheets with idle, walk, attack, hurt, and death animations. Terrible Knight uses Legacy Collection animations, including jump and two-hit sword swings. Their character-select previews animate too.
- Dragon uses the Legacy Collection flying dragon sprite, a spreading fire-breath Punch hitbox, weaving air dashes, and pulsing ground dashes. These imported art assets live under `assets/tinyrpg/` and `assets/legacy/`; the Legacy license is included. Older duplicate Soldier/Orc packs were not added.
- Shockston uses the static-pattern Seeker PRO cloak, a compact pixel-electric aura and the existing electrical USB-plug strike. Wizard wears a wand bandolier on his Seeker PRO cloak and casts spell bolts from his held wand. Gooder Gun Man uses a Ghost-inspired skull mask, headset, tactical vest, and twin guns. Their roster previews share the in-game pixel art; combat properties are unchanged.
- Archer uses the supplied GandalfHardcore green archer sheet, including idle, walk, draw/release, hurt, and death clips. Punch fires the pack's arrow sprite with 360-degree aim; charging increases power and speed. Arrows use existing projectile wrapping, shielding, reflection, and gravity-switch rules. Source assets and their README are included under `assets/archer/`.
- Anchor and Sword Kun use the supplied FREE_Knight v1.2 animations, Kite uses Demon_A, and Chungus uses Blood Monster_A. These are visual assignments only; their combat properties remain unchanged.
- Character Select offers Block / Pixel Art per player. Block uses the generic rectangle; Pixel Art uses the assigned model with a safe block fallback when no art is assigned. Preferences are remembered locally and carry through match resets and online snapshots.
- Punching a projectile reflects it along the Punch vector, transfers hit ownership, and grants normal clean-hit air-dash refills and recovery cancels. Reflections halve remaining lifetime and obey the new owner's active cap. Wizard/Archer use 3/5-shot magazines, 1.1/1.4-second conjuring reloads, character-mounted ammo pips and reduced projectile stun. See [PROJECTILE_MAGAZINES.md](PROJECTILE_MAGAZINES.md) for current tuning.
- Stage selection starts with Flip Chamber, Uplift, Perch, High Perch, Battlefield, Smash Vile, and Corners, followed by the remaining stages in their previous order.
- Crosswire is a fixed-camera enclosed arena with a central switch cycling gravity down, left, up, and right. The gravity-side wall acts as ground, including resource refills and super jumps away from it. Offset paired openings on all four edges remap fighter and bullet exits to the opposing opening; colored gate marks show the pairs. Gravity axis and direction synchronize online.
- AI recognizes solid walls, floors, platforms, and downward-blocking one-way platforms, then compares local detours with horizontal, vertical, and floor-hole screen-warp routes instead of attacking through terrain.
- Each KO can only award score and trigger round reset once, even if the downed ragdoll keeps getting hit afterward.
# Optional Art

Field Goal is a separate Court/Battle Dashball arena with elevated football
uprights, physical ricochets and defensive perches. Existing Soccer rules and
ball physics remain. See [FIELD_GOAL.md](FIELD_GOAL.md) for tuning and verification.

Character-art assignments and replacement instructions: [ART_ASSETS.md](ART_ASSETS.md).

