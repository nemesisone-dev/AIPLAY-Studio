/** Full local interface, without starting a local generation engine. */
process.env.AIPLAY_REMOTE_ONLY = "1";
process.env.AIPLAY_MUSIC_ONLY = "0";
await import("../server/index.js");
