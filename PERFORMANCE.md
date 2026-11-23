# Presentation Performance Pass

No simulation, combat, AI, input timing or rollback rules were changed.

- Sprite sheets load on first use, rather than requesting every animation for the entire roster at startup. Shared art URLs reuse one Image object. Images decode asynchronously.
- Imported sprite outlines are baked into a bounded least-recently-used canvas cache. Repeated draws, including dash ghosts, reuse the outlined bitmap instead of executing five live drop-shadow filters. The cache allows up to 256 frames / roughly 8 MB of bitmap pixels (2 million pixels), excluding browser overhead. Procedural pixel characters retain their authored dark outlines without the extra live filter chain.
- The hidden arena canvas is not redrawn while a menu or the stage builder is active. CSS menu animation and builder rendering are unchanged.
- HTTP responses use ETags and mandatory revalidation. Unchanged files return 304 with no body; updated source/art still reload immediately. The health endpoint remains uncached.

Local headless Chrome sample (1280x900, Orbit + Runway, 180 frames):

| Measurement | Before | After |
| --- | --- | --- |
| Initial image requests | 184 | 1 |
| Median frame interval | 16.7 ms | 16.7 ms |
| 95th percentile frame interval | 33.4 ms | 16.7 ms |
| Frames above 25 ms | 21 / 180 | 0 / 180 |

These are one-machine samples, not guarantees for physical devices, the embedded browser, or all match combinations. Test actual controller play to assess remaining stutter.

`npm run test:performance` verifies deferred loading, bitmap reuse and memory bounds, nonblank canvas, unchanged simulation hashes during rendering, error-free desktop/mobile rendering and conditional HTTP caching. It reports frame times without imposing machine-dependent FPS assertions.
