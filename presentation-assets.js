"use strict";

// Optional art layer: disabling this file leaves gameplay and built-in art intact.
(() => {
const root = "assets/optional/";
const scenery = (column, row, baseColor) => ({ src:"assets/backdrops/quiet-worlds.png", sourceWidth:1536, sourceHeight:1024,
  crop:[column * 0.5, row * 0.5, 0.5, 0.5], opacity:0.42, baseColor, positionX:0.5, positionY:0.5 });
const forest = () => scenery(0,0,"#586760");
const dusk = () => scenery(1,0,"#655a61");
const sky = () => scenery(0,1,"#586b79");
const moon = () => scenery(1,1,"#62616e");
const stagePack = (theme,baseColor) => ({src:`assets/stages/${theme}/scene.png`,sourceWidth:960,sourceHeight:540,
  opacity:1,baseColor,pixelArt:true,hd2d:theme,groundSrc:`assets/stages/${theme}/ground.png`,edgeSrc:`assets/stages/${theme}/edge.png`,
  ...(["castle-prison","snowy-mountains"].includes(theme)?{terrainVariation:{body:[1024,512],edge:[1024,16]}}:{})});
const sheet = (src, frames, extra = {}) => ({ src: root + src, frames, ...extra });
const sequence = (state, frames) => ({ frames, sources: Array.from({ length: frames }, (_, i) => `${root}heroine/Female_Hero_Pixel_Art_v1.1/${state}/east/frame_${String(i).padStart(2, "0")}.png`) });
const renegade = "renegade/SMS BRAWLER Character Renegade FREE FILES/Renegade_";
const kungfu = "kungfu/Kung Fu Platformer Character/Skin 1/C1 - ";
const samurai = "samurai/FREE_Samurai 2D Pixel Art v1.2/Sprites/";
const seeker = "seeker/Seeker_Lite/Spritesheets/Seeker_Void_";
const seekerPro = "seeker-pro/Seeker_PRO/Spritesheets/Void/Seeker_Void_";
const seekerCast = "seeker-pro/Seeker_PRO/Spritesheets/Dream/Seeker_Dream_Cast_40x40_11f.png";
// Body centers in source pixels: cancel authored root translation, not the poses.
const seekerHurtAnchors=[[26,40],[26,40],[25,37],[26,38],[25,40],[26,43],[26,42],[26,40],[26,40]];
const seekerKnockbackAnchors=[[40,40],[40,40],[34,37],[29,38],[21,40],[15,43],[15,42],[15,40],[15,40]];
const legacy = "assets/legacy/Legacy Collection/Assets/Gothicvania/Characters/";
const legacySheet = (folder, file, frames, extra = {}) => ({ src:legacy+folder+"/Spritesheets/"+file+".png", frames, ...extra });
const girl = (number, idle, attack, block) => ({ width:128, height:128, bodyHeight:67, foot:116, previewScale:1.25, clips:{
  idle:sheet(`schoolgirls/Girl_${number}/Idle.png`,idle), walk:sheet(`schoolgirls/Girl_${number}/Walk.png`,12),
  attack1:sheet(`schoolgirls/Girl_${number}/Attack.png`,attack), block:sheet(`schoolgirls/Girl_${number}/Protection.png`,block),
} });
window.DASH_PUNCH_ART = {
  enabled: true,
  assignments: {
    anchor: { spriteSet: "seekerprofist", spriteTint: "#efa15b" },
    defiplate: { spriteSet: "defiplate" },
    swordkun: { spriteSet: "knight2" },
    kite: { spriteSet: "seekerpro", spriteTint: "#f487b2" },
    chungus: { spriteSet: "chungusseeker" },
    boomerangus:{spriteSet:"boomerangus"},
    paul: { spriteSet: "renegade" },
    bront: { spriteSet: "khabib" },
    needle: { spriteSet: "kungfu" },
    nowhiff: { spriteSet: "kungfu" },
    vesper: { spriteSet: "heroine" },
    whipado: { spriteSet: "seekerprowhip", spriteTint: "#9285eb", chaseSpriteSet: "seekerprocast" },
    orbit: { spriteSet: "seekerpro", spriteTint: "#9259bf" },
    spike: { spriteSet: "seekerpro" },
    phantom: { spriteSet: "seekerpro", spriteTint: "#bddbd1" },
    booster: { spriteSet: "seekerpro", spriteTint: "#b6ca68" },
    lamer: { spriteSet: "seekerpro", spriteTint: "#9da5ce" },
    reflektor: { spriteSet: "seekerpro", spriteTint: "#a9becb" },
    lancer: { spriteSet: "seekerprolancer", spriteTint: "#9dbfa4" },
    icer: { spriteSet: "seekerpro", spriteTint: "#527496" },
    ember: { spriteSet: "seekerpro", spriteTint: "#342b32" },
    rain: { spriteSet: "seekerpro", spriteTint: "#5ecfea" },
    reverso: { spriteSet: "seekerpro", spriteTint: "#eb75e0" },
    zomg: { spriteSet: "schoolgirl1" },
    broadside: { spriteSet: "schoolgirl2" },
    drop: { spriteSet: "reaper" },
    edgebert: { spriteSet: "seekerproedgebert", spriteTint: "#f4f6f7" },
    kevin: { spriteSet: "crow" },
    microusb: { spriteSet: "seekerproelectric", spriteTint: "#c2d6dc" },
    gunman: { spriteSet: "seekerprogun", spriteTint: "#d9ab56" },
    archer: { spriteSet: "seekerproarcher", spriteTint: "#b4dc60" },
  },
  // Each set describes frame sizes, pivots, previews, and named animation clips.
  spriteSets: {
    defiplate:{width:29,height:16,bodyHeight:16,foot:16,pivotX:14.5,previewScale:3,proVisuals:true,
      barbell:{src:"assets/defiplate/barbell.png",width:64,height:8,scale:3,sleeveX:46,gripX:12,gripWidth:8,attachY:-6},
      clips:{idle:{src:"assets/defiplate/plate.png",frames:1,fps:1}}},
    chungusseeker: { width:313.5,height:313.5,bodyHeight:190,foot:278,pivotX:156.75,pixelGrid:46,scaleGrid:52,streamFist:{src:root+"seeker-pro/chungus-arm.png",width:96,height:32},facingLeft:false,previewScale:0.4,previewOffsetY:-25,clips:{
      idle:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,fps:3}),
      walk:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,startFrame:2,fps:8}),
      dash:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,startFrame:2,fps:8}),
      jump:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,startFrame:3}),
      cling:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:1}),
      crouch:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:1,startFrame:1,holdFrame:0}),
      attack1:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,row:1,startFrame:2,strikeFrames:[1,1]}),
      attack2:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,row:1,startFrame:2,strikeFrames:[1,1]}),
      attackAir:sheet("seeker-pro/chungus-seeker-atlas.png",2,{columns:4,rows:4,row:1,startFrame:2,strikeFrames:[1,1]}),
      attackUp:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:2,startFrame:1}),
      attackDown:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:2,startFrame:2}),
      hurt:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:2,startFrame:3}),
      death:sheet("seeker-pro/chungus-seeker-atlas.png",1,{columns:4,rows:4,row:3,startFrame:1}),
    } },
    seekerpro: { width:30, height:30, bodyHeight:24, foot:28, pivotX:15, facingLeft:false, previewScale:3,flattenFrame:12, clips:{
      idle:sheet(seekerPro+"Idle_30x30_24f.png",24,{fps:10}),
      walk:sheet(seekerPro+"Run_30x30_10f.png",10,{pivotX:17,fps:14}),
      dash:sheet(seekerPro+"Dash_30x30_5f.png",5,{pivotX:18,foot:26,fps:25}),
      jump:sheet(seekerPro+"JumpFall_30x30_28f.png",28,{pivotX:16,airPhases:{rise:[1,12],apex:[13,14],fall:[15,25]}}),
      cling:sheet(seekerPro+"WallSlide_40x40_5f.png",5,{width:40,height:40,pivotX:18,foot:36,fps:10}),
      crouch:sheet(seekerPro+"Crouch_30x30_5f.png",5,{foot:27,holdFrame:3}),
      attack1:sheet(seekerPro+"Attack1_90x50_8f.png",8,{width:90,height:50,pivotX:16,foot:38,strikeFrames:[3,4]}),
      attack2:sheet(seekerPro+"HeavyAttack_117x80_11f.png",11,{width:117,height:80,pivotX:33,foot:72,strikeFrames:[5,6]}),
      attackAir:sheet(seekerPro+"JumpAttack_90x50_9f.png",9,{width:90,height:50,pivotX:19,foot:44,strikeFrames:[3,4]}),
      attackUp:sheet(seekerPro+"UpAttack_55x80_8f.png",8,{width:55,height:80,pivotX:23,foot:78,strikeFrames:[3,4]}),
      attackDown:sheet(seekerPro+"DownAttack_55x80_7f.png",7,{width:55,height:80,pivotX:21,foot:42,strikeFrames:[3,4]}),
      hurt:sheet(seekerPro+"Hurt_55x80_9f.png",9,{width:55,height:80,pivotX:26,foot:52,frameAnchors:seekerHurtAnchors,durations:[40,60,50,50,50,60,60,80,100]}),
      knockback:sheet(seekerPro+"HurtKnockback_55x80_9f.png",9,{width:55,height:80,pivotX:40,foot:52,frameAnchors:seekerKnockbackAnchors,durations:[40,60,50,50,50,60,60,80,100]}),
      death:sheet(seekerPro+"Death_40x50_20f.png",20,{width:40,height:50,pivotX:20,foot:48,durations:[100,80,80,80,100,80,70,70,70,70,70,80,80,80,80,80,80,80,80,900]}),
    } },
    seekerprocast: { width:40,height:40,bodyHeight:24,foot:33,pivotX:19,facingLeft:false,previewScale:3,clips:{
      idle:sheet(seekerCast,11,{fps:15}), attack1:sheet(seekerCast,11),
    } },
    bridgeheroine: { width:128, height:64, bodyHeight:40, foot:63, previewScale:2, clips:{
      idle:legacySheet("Bridge Heroine/Heroine base","idle",4), walk:legacySheet("Bridge Heroine/Heroine base","run",7),
      attack1:legacySheet("Bridge Heroine/Heroine base","attack",5), jump:legacySheet("Bridge Heroine/Heroine base","jump",4),
    } },
    reaper: { width:32, height:48, bodyHeight:31, foot:47, previewScale:2.5, clips:{
      idle:legacySheet("death","death-lamp-walk",6), walk:legacySheet("death","death-walk",6), attack1:legacySheet("death","death-lamp-rise",11),
    } },
    werewolf: { width:96, height:76, bodyHeight:38, foot:75, previewScale:2, previewOffsetY:-16, clips:{
      idle:legacySheet("WereWolf","werewolf-idle",5), walk:legacySheet("WereWolf","werewolf-run",6),
      jump:legacySheet("WereWolf","werewolf-jump",2), fall:legacySheet("WereWolf","werewolf-fall",2), attack1:legacySheet("WereWolf","werewolf-jump",2),
    } },
    crow: { width:48, height:48, bodyHeight:26, foot:35, previewScale:2.7, clips:{
      idle:legacySheet("crow","crow-idle",3), walk:legacySheet("crow","crow-fly",2), jump:legacySheet("crow","crow-fly",2),
      fall:legacySheet("crow","crow-fly",2), attack1:legacySheet("crow","crow-front",3),
    } },
    renegade: { width:16, height:32, bodyHeight:28, foot:31, previewScale:3, clips:{
      idle:sheet(renegade+"Idle_1_strip4.png",4), walk:sheet(renegade+"Run_1_strip4.png",4),
      attack1:sheet(renegade+"Punch_1.png",1,{width:24,pivotX:8}), attack2:sheet(renegade+"Punch_2.png",1,{width:24,pivotX:8}),
      hurt:sheet(renegade+"Hurt.png",1), death:sheet(renegade+"Knock_Out.png",1,{width:24}),
      cling:sheet(renegade+"Climb_strip4.png",4),
    } },
    khabib: { width:64, height:64, bodyHeight:52, foot:60, previewScale:1.8, clips:{
      idle:sheet("khabib/khabib nurm/khabib nurm version 1.png",4),
      attack1:sheet("khabib/khabib nurm/khabib nurm version 1.png",1,{columns:4,startFrame:1}),
      block:sheet("khabib/khabib nurm/khabib nurm version 1.png",1,{columns:4,startFrame:2}),
    } },
    kungfu: { width:41, height:28, bodyHeight:22, foot:27, previewScale:3.5, clips:{
      idle:sheet(kungfu+"Idle.png",14), walk:sheet(kungfu+"Run.png",8), attack1:sheet(kungfu+"4 Punch Combo (Decomposed)/C1 - Punch 1.png",4),
      attack2:sheet(kungfu+"Side Kick.png",7), block:sheet(kungfu+"Jeet Kune Do Fighting Stance.png",8), hurt:sheet(kungfu+"Hit.png",5), death:sheet(kungfu+"Die.png",11),
      jump:sheet(kungfu+"Jump Standing (Decomposed)/C1a - Hop JS.png",6), fall:sheet(kungfu+"Jump Standing (Decomposed)/C1c - Fall Loop JS.png",3),
    } },
    heroine: { width:320, height:320, bodyHeight:225, foot:272, previewScale:0.4, clips:{
      idle:sequence("Idle",8), walk:sequence("Run",8), jump:sequence("Jump",7), cling:sequence("Climb",9), block:sequence("Guard",8), attack1:sequence("Attack",9), hurt:sequence("Hurt",9), death:sequence("Death",8),
    } },
    samurai: { width:96, height:96, bodyHeight:48, foot:81, previewScale:1.7, clips:{
      idle:sheet(samurai+"IDLE.png",10), walk:sheet(samurai+"RUN.png",16), attack1:sheet(samurai+"ATTACK 1.png",7), hurt:sheet(samurai+"HURT.png",4),
    } },
    gorgon: { width:128, height:128, bodyHeight:80, foot:127, previewScale:1.1, previewOffsetY:-22, clips:{
      idle:sheet("gorgon/Gorgon_1/Idle.png",7), walk:sheet("gorgon/Gorgon_1/Run.png",7), attack1:sheet("gorgon/Gorgon_1/Attack_1.png",16), attack2:sheet("gorgon/Gorgon_1/Attack_3.png",10), hurt:sheet("gorgon/Gorgon_1/Hurt.png",3), death:sheet("gorgon/Gorgon_1/Dead.png",3),
    } },
    seeker: { width:30, height:30, bodyHeight:24, foot:28, pivotX:15, facingLeft:false, previewScale:3, clips:{
      idle:sheet(seeker+"Idle_30x30_24f.png",24,{fps:10}), walk:sheet(seeker+"Run_30x30_10f.png",10,{pivotX:17,fps:14}),
      jump:sheet(seeker+"JumpFall_30x30_28f.png",28,{pivotX:16,airPhases:{rise:[1,12],apex:[13,14],fall:[15,25]}}),
      attack1:sheet(seeker+"Attack1_90x50_8f.png",8,{width:90,height:50,pivotX:16,foot:38,strikeFrames:[3,4]}),
      hurt:sheet(seeker+"Hurt_55x80_9f.png",9,{width:55,height:80,pivotX:26,foot:52,frameAnchors:seekerHurtAnchors,durations:[40,60,50,50,50,60,60,80,100]}),
      death:sheet(seeker+"Death_40x50_20f.png",20,{width:40,height:50,pivotX:20,foot:48,durations:[100,80,80,80,100,80,70,70,70,70,70,80,80,80,80,80,80,80,80,900]}),
    } },
    satyr: { width:32, height:32, bodyHeight:24, foot:29, previewScale:3, clips:{
      idle:sheet("satyr/SPRITE_SHEET.png",6,{row:0,columns:10,rows:11}), walk:sheet("satyr/SPRITE_SHEET.png",8,{row:1,columns:10,rows:11}),
      attack1:sheet("satyr/SPRITE_SHEET.png",7,{row:3,columns:10,rows:11}), hurt:sheet("satyr/SPRITE_SHEET.png",4,{row:7,columns:10,rows:11}),
    } },
    schoolgirl1:girl(1,9,8,4), schoolgirl2:girl(2,7,9,2),
  },
  spriteOverrides: {
    knight: { clips:{
      cling:legacySheet("Terrible Knight","player-ClimbLedge",5),
      attackAir:legacySheet("Terrible Knight","player-AirSwordSlash",6),
      attackUp:legacySheet("Terrible Knight","player-Attack Up",3),
      attackCrouch:legacySheet("Terrible Knight","player-CrouchSwordSlash",4),
    } },
  },
  // Backdrops are cosmetic only; stage terrain continues to define collision.
  backdrops: {
    "Flip Chamber": stagePack("castle-prison","#171d25"), "Crosswire": stagePack("castle-prison","#171d25"), "Uplift": stagePack("snowy-mountains","#697e89"),
    "Perch": stagePack("deep-forest","#263d39"), "High Perch": stagePack("snowy-mountains","#697e89"), "High Perch Drift": stagePack("strange-world","#4c5552"), "Battlefield": stagePack("deep-forest","#263d39"),
    "Smash Vile": stagePack("strange-world","#4c5552"), "Corners": stagePack("deep-forest","#263d39"), "Split": dusk(),
    "Enchanted Forest": {...stagePack("deep-forest","#263d39"),hd2d:"enchanted-forest"},
    "Castle Dungeon": {...stagePack("castle-prison","#171d25"),hd2d:"castle-dungeon"},
    "Flat": forest(), "Castle 64": dusk(), "Sling": forest(),
    "Block": sky(), "Vault": moon(), "Colossus": moon(),
    "Cutline": moon(), "Clamp": dusk(), "Towerfall": dusk(), "Cutbox": forest(),
  },
};
// Ranged fighters share the same Seeker body, with the pack's bow/cast poses.
const boomerangClip=(frames,extra={})=>({src:"assets/boomerangus/armed.png",unarmedSrc:"assets/boomerangus/unarmed.png",frames,columns:4,rows:4,...extra});
window.DASH_PUNCH_ART.spriteSets.boomerangus={width:52,height:52,bodyHeight:36,foot:49,pivotX:26,proVisuals:true,previewScale:2.4,roundRosterScale:true,pixelGrid:46,scaleGrid:52,pixelPaletteStep:0,
  boomerangSprite:{src:"assets/boomerangus/boomerang-spin.png",width:32,height:32,frames:16,fps:28,scale:3,pixelGrid:28,pixelPaletteStep:0},
  clips:{idle:boomerangClip(2,{fps:3}),walk:boomerangClip(2,{startFrame:2,fps:6}),dash:boomerangClip(2,{startFrame:2,fps:8}),
    jump:boomerangClip(1,{startFrame:3}),fall:boomerangClip(1,{startFrame:2}),cling:boomerangClip(1,{row:1}),crouch:boomerangClip(1,{row:1,startFrame:1}),
    attack1:boomerangClip(2,{row:1,startFrame:2,strikeFrames:[1,1]}),attack2:boomerangClip(2,{row:1,startFrame:2,strikeFrames:[1,1]}),
    hurt:boomerangClip(1,{row:2,startFrame:3}),death:boomerangClip(1,{row:3,startFrame:1})}};
const baseSeeker=window.DASH_PUNCH_ART.spriteSets.seekerpro;
window.DASH_PUNCH_ART.spriteSets.seekerproedgebert={...baseSeeker,clips:{...baseSeeker.clips,
  attack1:{...baseSeeker.clips.attack1,sequenceDurations:[40,40,60,40,60,40,60,80]},
  attack2:sheet(seekerPro+"Attack2_90x50_5f.png",5,{width:90,height:50,pivotX:18,foot:43,strikeFrames:[1,2],sequenceDurations:[60,40,60,40,80]}),
  attack3:sheet(seekerPro+"Attack3_200x50_10f.png",10,{width:200,height:50,pivotX:102,foot:43,strikeFrames:[5,6],sequenceDurations:[40,40,60,60,40,40,60,60,80,100]}),
  attackUp:{...baseSeeker.clips.attackUp,sequenceDurations:[40,40,60,40,60,60,80,80]},
  attackDown:{...baseSeeker.clips.attackDown,sequenceDurations:[40,40,60,40,60,60,100]},
}};
const {attackAir,attackUp,attackDown,...rangedClips}=baseSeeker.clips;
const bow=sheet(seekerPro+"Bow_55x80_22f.png",22,{width:55,height:80,pivotX:25,foot:53,bowDrawFrames:[0,8],bowReleaseFrames:[9,21]});
const cast=sheet(seekerPro+"CastBasic_64x48_14f.png",14,{width:64,height:48,pivotX:25,foot:41,recoilFrame:7});
const whipCast=sheet(seekerPro+"Cast_40x40_11f.png",11,{width:40,height:40,pivotX:19,foot:33});
window.DASH_PUNCH_ART.spriteSets.seekerprolancer={...baseSeeker,clips:{...baseSeeker.clips,attack1:whipCast,attack2:whipCast}};
const reload=sheet(seekerPro+"CastBig_Loop_64x48_8f.png",8,{width:64,height:48,pivotX:25,foot:41});
window.DASH_PUNCH_ART.spriteSets.seekerproarcher={...baseSeeker,
  arrowSprite:{src:root+"seeker-pro/Seeker_PRO/VFX/Void/Shots/Seeker_VFX_Void_Shot_Arrow_Projectile_28x8_3f.png",width:28,height:8,frames:3,fps:20,anchorX:24,anchorY:4},
  clips:{...rangedClips,attack1:bow,attack2:bow,reload,melee:baseSeeker.clips.attack1}};
window.DASH_PUNCH_ART.spriteSets.seekerprogun={...baseSeeker,
  spellProjectile:{src:root+"seeker-pro/Seeker_PRO/VFX/Void/Shots/Seeker_VFX_Void_Shot_Basic_Projectile_24x12_4f.png",width:24,height:12,frames:4,fps:20,anchorX:15,anchorY:6,
    impact:{src:root+"seeker-pro/Seeker_PRO/VFX/Void/Shots/Seeker_VFX_Void_Shot_Basic_Impact_32x32_7f.png",width:32,height:32,frames:7,fps:20,anchorX:16,anchorY:16}},
  clips:{...rangedClips,attack1:cast,attack2:cast,reload,melee:baseSeeker.clips.attack1}};
window.DASH_PUNCH_ART.spriteSets.seekerprowhip={...baseSeeker,magicWhip:true,clips:{...rangedClips,attack1:whipCast,attack2:whipCast}};
window.DASH_PUNCH_ART.spriteSets.seekerproelectric={...baseSeeker,magicPlug:true,clips:{...rangedClips,attack1:whipCast,attack2:whipCast}};
window.DASH_PUNCH_ART.spriteSets.seekerprofist={...baseSeeker,magicFist:root+"seeker-pro/anchor-fist-spell.png",clips:{...rangedClips,attack1:whipCast,attack2:whipCast}};
const proEffect=(palette,folder,file,width,height,frames,anchorX,anchorY,fps=20)=>({
  src:`${root}seeker-pro/Seeker_PRO/VFX/${palette}/${folder}/Seeker_VFX_${palette}_${file}_${width}x${height}_${frames}f.png`,width,height,frames,anchorX,anchorY,fps});
window.DASH_PUNCH_ART.effects={
  impact:proEffect("Void","Shots","Shot_Basic_Impact",32,32,7,16,16),
  clash:proEffect("Dream","Shots","Shot_Big_Impact",56,56,8,28,28),
  dash:proEffect("Void","Dust","Dust_Dash",40,20,7,30,18),
  land:proEffect("Void","Dust","Dust_Land",44,16,7,22,14),
  air:proEffect("Frost","Dust","AirJump_Ring",32,16,7,16,6),
  charge:proEffect("Void","Magic","Charge_Loop",48,48,8,24,24),
  chargeBig:proEffect("Void","Magic","Charge_Loop_Big",48,48,8,24,24),
  release:proEffect("Void","Magic","Charge_Release",48,48,6,24,24),
  aura:proEffect("Ember","Magic","Aura_Loop",40,48,16,20,44),
  sandbagFire:{src:"assets/sandbag/flames.png",width:40,height:64,frames:6,fps:12,anchorX:20,anchorY:64},
  power:proEffect("Dream","Magic","Power_Burst",64,64,10,32,58),
};
const environmentLayer=(theme,files,parallax,blur,grade)=>({sources:files.map(file=>`assets/stages/${theme}/${file}`),parallax,blur,grade});
window.DASH_PUNCH_ART.stageThemes={
  "deep-forest":{id:"deep-forest",base:"#20332f",grade:"#4d877b",fog:"rgba(106,153,141,.09)",fogBottom:"rgba(78,124,115,.14)",ambient:"rgba(155,204,171,.10)",shade:"rgba(5,16,28,.16)",light:"rgba(156,231,193,.7)",lightSoft:"rgba(156,231,193,.18)",layers:[
    environmentLayer("deep-forest",["background1.png","background2.png"],5,2,.16),
    environmentLayer("deep-forest",["background3.png"],12,1,.10),
    environmentLayer("deep-forest",["background4.png","background5.png"],23,0,.04)]},
  "snowy-mountains":{id:"snowy-mountains",base:"#637984",grade:"#9dbbc6",fog:"rgba(185,211,220,.10)",fogBottom:"rgba(153,189,205,.16)",ambient:"rgba(216,239,244,.12)",shade:"rgba(24,44,73,.14)",light:"rgba(183,226,255,.65)",lightSoft:"rgba(183,226,255,.16)",layers:[
    environmentLayer("snowy-mountains",["background1.png","background2a.png"],4,1.5,.12),
    environmentLayer("snowy-mountains",["background3.png"],11,.8,.08),
    environmentLayer("snowy-mountains",["background4.png","background5.png"],22,0,.03)]},
  "strange-world":{id:"strange-world",base:"#4c5552",grade:"#aca6b5",fog:"rgba(160,158,180,.09)",fogBottom:"rgba(110,123,145,.13)",ambient:"rgba(215,205,153,.10)",shade:"rgba(28,22,42,.18)",light:"rgba(223,196,244,.65)",lightSoft:"rgba(223,196,244,.16)",layers:[
    environmentLayer("strange-world",["background 1.png"],5,1.5,.12),
    environmentLayer("strange-world",["background 2.png","background 3.png"],12,.7,.08),
    environmentLayer("strange-world",["background 4.png"],22,0,.03)]},
  "castle-prison":{id:"castle-prison",base:"#171d25",grade:"#697e9b",fog:"rgba(100,126,158,.06)",fogBottom:"rgba(69,94,127,.13)",ambient:"rgba(149,181,220,.08)",shade:"rgba(3,7,14,.16)",light:"rgba(168,212,255,.7)",lightSoft:"rgba(168,212,255,.18)",layers:[
    {...environmentLayer("castle-prison",["background_obj.png"],4,1,.12),atlas:true},
    {...environmentLayer("castle-prison",["background_obj.png"],11,.5,.08),atlas:true},
    {...environmentLayer("castle-prison",["background_obj.png"],20,0,.04),atlas:true}],objects:[
      {src:"assets/stages/castle-prison/mainlevbuildB.png",crop:[448,96,112,96],x:200,y:100,w:112,h:96,luminous:false},
      {src:"assets/stages/castle-prison/mainlevbuildB.png",crop:[448,96,112,96],x:744,y:100,w:112,h:96,luminous:false},
      {src:"assets/stages/castle-prison/mainlevbuildB.png",crop:[640,80,48,40],x:144,y:270,w:96,h:80,luminous:true},
      {src:"assets/stages/castle-prison/mainlevbuildB.png",crop:[640,80,48,40],x:816,y:270,w:96,h:80,luminous:true}]},
};
// Team arenas share the installed pack layers; only their atmosphere differs.
const stageThemes=window.DASH_PUNCH_ART.stageThemes;
stageThemes["enchanted-forest"]={...stageThemes["deep-forest"],id:"enchanted-forest",
  grade:"#668a6b",ambient:"rgba(216,221,151,.10)",fog:"rgba(155,182,136,.07)",fogBottom:"rgba(93,144,126,.13)",
  light:"rgba(237,227,159,.65)",lightSoft:"rgba(218,235,171,.16)"};
stageThemes["castle-dungeon"]={...stageThemes["castle-prison"],id:"castle-dungeon",
  ambient:"rgba(231,169,99,.08)",light:"rgba(255,190,111,.65)",lightSoft:"rgba(240,168,97,.16)"};
window.DASH_PUNCH_ART.stageAtmospheres={
  "Crosswire":{parallaxScale:.8,hazeScale:.85},"Flip Chamber":{parallaxScale:.9,hazeScale:1.15},
  "Uplift":{parallaxScale:1.05,hazeScale:.85},"High Perch":{parallaxScale:1.1,hazeScale:1.15},
  "Perch":{parallaxScale:.85,hazeScale:.95},"Battlefield":{parallaxScale:.95,hazeScale:.8},"Corners":{parallaxScale:.75,hazeScale:1.15},
  "High Perch Drift":{parallaxScale:1.15,hazeScale:.9},"Smash Vile":{parallaxScale:.8,hazeScale:1},
  "Enchanted Forest":{parallaxScale:.8,hazeScale:.9},"Castle Dungeon":{parallaxScale:.65,hazeScale:1},
};
window.DASH_PUNCH_ART.backdrops.Whirlwell={...window.DASH_PUNCH_ART.backdrops.Perch};
// Sports scenery is presentation metadata, not an arena or collision registration.
const sportsLayer=(theme,numbers,parallax,drift=0)=>({sources:numbers.map(i=>`assets/stages/sports/${theme}/layer-${i}.png`),parallax,drift,blur:0,grade:.08});
const sportsTheme=(id,base,grade,layers,shade)=>({id,pixelArt:true,fixedView:true,base,grade,layers,shade});
Object.assign(stageThemes,{
  "sports-sky":sportsTheme("sports-sky","#3184aa","#7198ac",[
    sportsLayer("sky",[1],0),sportsLayer("sky",[2,3],4,3),sportsLayer("sky",[4],8,6)],"rgba(17,34,49,.27)"),
  "sports-temple":sportsTheme("sports-temple","#34394a","#565a65",[
    sportsLayer("temple",[5,4],2,1),sportsLayer("temple",[3,2],5),sportsLayer("temple",[1],8)],"rgba(17,30,38,.45)"),
  "sports-hall":sportsTheme("sports-hall","#343c42","#756d68",[
    sportsLayer("hall",[3],1),sportsLayer("hall",[2],4),sportsLayer("hall",[1],6)],"rgba(17,27,37,.46)"),
  "sports-courtyard":sportsTheme("sports-courtyard","#384449","#677b7a",[
    sportsLayer("courtyard",[3],2),sportsLayer("courtyard",[2],5),sportsLayer("courtyard",[1],8)],"rgba(17,29,40,.48)"),
  "sports-citadel":sportsTheme("sports-citadel","#3c354b","#79536e",[
    sportsLayer("citadel",[4,3],2,2),sportsLayer("citadel",[2],5),sportsLayer("citadel",[1],8)],"rgba(32,24,47,.49)"),
});
for(const theme of["sky","temple","hall","courtyard","citadel"]){
  const name=`sports-${theme}`,profile=stageThemes[name];
  window.DASH_PUNCH_ART.backdrops[name]={src:`assets/stages/sports/${theme}/${theme==="sky"?"layer-1.png":"scene.png"}`,
    sourceWidth:576,sourceHeight:324,pixelArt:true,opacity:theme==="sky"?.8:.55,baseColor:profile.base,hd2d:name,...(theme!=="hall"?{turfPlatforms:true}:{})};
  window.DASH_PUNCH_ART.stageAtmospheres[name]={parallaxScale:1,hazeScale:1};
}
window.DASH_PUNCH_ART.sportsScenery={
  "dash-pong":"Flip Chamber",
  standard:"sports-sky","standard-open":"sports-sky","standard-wide":"sports-sky",
  "gravity-soccer":"sports-sky","gravity-soccer-open":"sports-sky",
  "field-goal":"sports-sky","field-goal-wide":"sports-sky",volleyball:"sports-sky",
  "tri-ball":"sports-sky","tri-ball-wrap":"sports-sky",
  "sticky-ball":"sports-temple","sticky-ball-flip":"sports-temple",
  elevated:"sports-hall","elevated-open":"sports-hall",
  "target-break":"sports-courtyard","golden-rush":"sports-courtyard","gravity-golden-rush":"sports-courtyard",
  "target-charge-stationary":"sports-citadel","target-charge-vertical":"sports-citadel","target-charge-roaming":"sports-citadel",
};
window.DASH_PUNCH_ART.stageAtmospheres.Whirlwell={...window.DASH_PUNCH_ART.stageAtmospheres.Perch};
})();
