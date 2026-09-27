import path from "node:path";
import { createReadStream } from "node:fs";
import { createAceTraining } from "./ace-training.js";
import { containedFile, readBody, sendJSON } from "../engine/remote-common.js";

/** A single browser API for ACE-Step training on this PC or the connected Pod. */
export function createCustomModelRoutes({ config, remoteClient }) {
  let localPromise;
  const local = () => localPromise ||= createAceTraining({
    rootDir: path.join(config.dataDir, "custom-models"),
    lorasDir: path.join(config.rig, "ComfyUI", "models", "loras"),
    aceURL: process.env.AIPLAY_ACE_URL || "http://127.0.0.1:8001",
  });
  const targetOf = value => {
    const target = String(value || (config.remoteOnly ? "runpod" : "local"));
    if (!new Set(["local", "runpod"]).has(target)) throw new Error("Choose This PC or RunPod.");
    if (target === "runpod" && !remoteClient) throw new Error("Start Studio in RunPod GPU mode to train on a Pod.");
    return target;
  };
  const route = async (req, res, url) => {
    if (!url.pathname.startsWith("/api/custom-models")) return false;
    try {
      const origin = req.headers.origin;
      const allowed = [`http://127.0.0.1:${config.uiPort}`, `http://localhost:${config.uiPort}`];
      if (origin && !allowed.includes(origin)) { sendJSON(res, 403, { error: "Cross-origin training requests are not allowed." }); return true; }
      if (req.method !== "GET" && !origin && !req.headers["x-aiplay-actor"]) { sendJSON(res, 403, { error: "Send this training request from AIPLAY Studio." }); return true; }
      const upload = /^\/api\/custom-models\/([a-f0-9-]{36})\/files$/.exec(url.pathname);
      if (upload && req.method === "POST") {
        const target = targetOf(url.searchParams.get("target")), name = url.searchParams.get("name");
        const result = target === "local" ? await (await local()).upload(upload[1], name, req)
          : await (await remoteClient()).trainingUpload(upload[1], name, req);
        sendJSON(res, 200, result); return true;
      }
      if (url.pathname !== "/api/custom-models") { sendJSON(res, 404, { error: "Unknown custom model operation." }); return true; }
      if (req.method === "GET") {
        const target = targetOf(url.searchParams.get("target"));
        const result = target === "local" ? await (await local()).list() : await (await remoteClient()).trainingList();
        sendJSON(res, 200, { ...result, target }); return true;
      }
      if (req.method !== "POST") { sendJSON(res, 405, { error: "Method not allowed." }); return true; }
      const body = JSON.parse((await readBody(req)).toString("utf8")), target = targetOf(body.target);
      if (body.action === "addLibrary") {
        if (!Array.isArray(body.files) || body.files.length > 100) throw new Error("Choose up to 100 library songs.");
        if (target === "local") sendJSON(res, 200, await (await local()).addLibrary(body.id, body.files, config.outputDir));
        else {
          const client = await remoteClient(); let result = null;
          for (const relative of [...new Set(body.files)]) {
            const full = await containedFile(config.outputDir, relative);
            result = await client.trainingUpload(body.id, path.basename(relative), createReadStream(full));
          }
          sendJSON(res, 200, result);
        }
        return true;
      }
      const service = target === "local" ? await local() : null;
      const allowedActions = new Set(["create", "prepare", "check", "start", "stop", "delete"]);
      if (!allowedActions.has(body.action)) throw new Error("Unknown custom model action.");
      const result = service ? await service[body.action === "delete" ? "remove" : body.action](...(body.action === "create" ? [body]
        : body.action === "start" ? [body.id, body.settings] : [body.id]))
        : await (await remoteClient()).trainingAction(body);
      sendJSON(res, body.action === "create" ? 201 : ["prepare", "start"].includes(body.action) ? 202 : 200, result);
    } catch (error) { if (!res.headersSent) sendJSON(res, 400, { error: error.message || String(error) }); }
    return true;
  };
  return route;
}
