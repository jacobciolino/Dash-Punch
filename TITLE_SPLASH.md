# Orbit And Anchor Title Splash

Final installed asset: `assets/backdrops/dash-punch-orbit-anchor.png`.
Created with the built-in image-generation tool in edit mode, not the API/CLI.
The existing `dash-punch-pixel-faceoff.png` is retained unchanged.

Orbit is the purple, green-eyed hooded fighter dashing right. Anchor is the
amber hooded fighter projecting a green spell-fist left toward Orbit. The first
pass's incorrect right-facing fist was corrected before installation.

Only the title background reference and its full-scene framing change. The
title, controls, Experimental Content switch, fighter sprites, simulation,
attack animations and gameplay are unchanged. This is title illustration, not
a new animated cutscene. Contain framing keeps both characters visible in tall
desktop windows; the existing mobile treatment remains.

The supplied Seeker PRO character palette and existing spell visual inform the
character identities. This does not replace or redistribute the source sprite
pack. Existing source credits and license remain in the project.

## Initial Edit Prompt

Use case: precise-object-edit. Asset type: 16:9 pixel-art title-screen background for the existing game Dash Punch. Image 1 is the EDIT TARGET, the current red gothic castle faceoff splash. Image 2 is a reference for Anchor's existing green magical fist spell; do not import its black background. Image 3 is a gameplay identity reference: ONLY the PURPLE HOODED fighter on the LEFT is Orbit. Ignore the green spiked fighter on its right and all gameplay HUD/platforms. CHANGE ONLY THE TWO FIGHTERS AND THEIR ATTACK/MOTION DETAILS in image 1, keeping the red sunset, gothic castle ruins, bridge, broad faceoff composition and pixel-art setting. Replace the left white-haired human with ORBIT: a small simple purple-cloaked hooded mage, black shadow face with bright green eyes, no visible hair or human face, unmistakably horizontally DASHING FROM LEFT TOWARD RIGHT, airborne near the lower-middle left, whole body leaning almost horizontal, hood leading, purple cloak flaring backward and several crisp lavender/white speed streaks trailing toward the left. His green eyes and simple purple Seeker-style hood should be legible. Replace the right human fighter with ANCHOR: amber/orange hood and cloak, a dark featureless hooded face with two green glowing eyes, planted behind a huge projected GREEN MAGICAL PUNCH. Anchor punches TOWARD LEFT at Orbit, NOT shooting a gun or using a sword. The giant green spectral clenched fist is extremely foreshortened toward the center/viewer and dominates around 85-90 percent of Anchor's right-side silhouette, with chunky square emerald, mint and white-highlight pixel clusters and bold dark pixel outlines, echoing reference 2. Keep enough of Anchor's amber hood and small casting/punching arm visibly behind the huge green fist at the right edge so his character identity is clear. This is a FACE-OFF, with the punch and dash still visibly approaching, not already colliding. Both fighters must look like simple enlarged GAME PIXEL ART, not detailed anime humans or smooth illustrations. Coarse consistent pixel density, sharply stepped contours, limited flat palette shading, no realistic skin/knuckles on the green spell, no smoothing, no blur, no sword slash, no lens flare, no new characters or logos. Keep the top center quarter of the artwork mostly quiet red sky for the existing HTML title overlay, and the bottom approximately 12 percent clear enough for the current menu buttons. No text at all, no UI, no watermark. Maintain the original wide landscape aspect ratio. This is only a cosmetic menu asset, not a change to game sprites.

## Final Direction Correction Prompt

Use case: precise-object-edit. This attached image is the EDIT TARGET: the new Dash Punch pixel-art title background with purple Orbit dashing from left to right and amber Anchor casting on the right. Make ONE correction: TURN ONLY THE HUGE GREEN MAGICAL FIST AROUND HORIZONTALLY. It is currently pointing the wrong way. Anchor must be punching LEFT TOWARD ORBIT. Mirror the green fist itself so the striking knuckles/finger front are on the LEFT side (toward Orbit) and its wrist/forearm are on the RIGHT, connected back to Anchor's casting hand/sleeve. The thumb and curled fingers must mirror accordingly. Remove the misleading left-side wrist/energy tail and connect the magical wrist to the caster on the RIGHT instead. Keep the same giant fist size, bright emerald/mint/white pixel palette, chunky pixel grid and dominant foreground placement. Keep Anchor's body, hood and face where they are; do not flip Anchor or the whole image. Do not flip or change Orbit: he still dashes RIGHT. Keep the entire red sunset gothic castle background, bridge, all composition, both character identities, purple speed streaks and empty top area unchanged. Do not add text or UI. No other edits.

## Verification

`tests/title-splash.browser.test.js` checks asset loading, pixelated rendering,
purple/green subject coverage, full-scene framing, title/control separation,
button fit at five viewport sizes and normal entry into the core lobby.
Captures: `artifacts/title-splash/`.
