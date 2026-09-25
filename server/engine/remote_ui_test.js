import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imageWorkflowOptions, modelChoices, videoWorkflowOptions } from "../../web/runpod-integrated.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), "utf8");

test("normal Images and Video screens expose RunPod without replacing local rendering", () => {
  const html = read("web", "index.html");
  assert.match(html, /id="imgRenderWhere"[\s\S]*value="local"[\s\S]*value="runpod"/);
  assert.match(html, /id="vidRenderWhere"[\s\S]*value="local"[\s\S]*value="runpod"/);
  assert.match(html, /id="runpodWorkerToken"[^>]*type="password"/);
  assert.match(html, /id="imgRunPodCfg"[^>]*value="6"/);
  assert.match(html, /id="imgRunPodNegative"/);
  assert.match(html, /id="vidRunPodSize"[\s\S]*value="512x320"/);
  assert.match(html, /id="vidRunPodGuidance"[^>]*value="3"/);
  assert.match(html, /src="runpod-integrated\.js"/);
});

test("ComfyUI legacy and 0.37 COMBO model choices both populate the integrated picker", () => {
  assert.deepEqual(modelChoices([["a.safetensors", "b.safetensors"]]), ["a.safetensors", "b.safetensors"]);
  assert.deepEqual(modelChoices(["COMBO", { options: ["new.safetensors"] }]), ["new.safetensors"]);
});

test("integrated image options retain the selected remote checkpoint and common controls", () => {
  assert.deepEqual(imageWorkflowOptions({ prompt: "lake", checkpoint: "sd15.safetensors", width: 512,
    height: 512, steps: 20, seed: 7, count: 2, negative: "blur", cfg: 6.5 }), {
    prompt: "lake", checkpoint: "sd15.safetensors", ckpt: "sd15.safetensors", width: 512,
    height: 512, steps: 20, seed: 7, count: 2, negative: "blur", cfg: 6.5,
  });
});

test("integrated LTX options retain video controls and duration aliases", () => {
  assert.deepEqual(videoWorkflowOptions({ prompt: "robot", negative: "blur", width: 512, height: 320,
    seconds: 2, steps: 8, seed: 9, guidance: 3 }), {
    prompt: "robot", negative: "blur", width: 512, height: 320, seconds: 2,
    duration: 2, maxDuration: 2, steps: 8, seed: 9, guidance: 3,
  });
});

test("remote-only launch opens the integrated application", () => {
  const server = read("server", "index.js");
  assert.match(server, /`http:\/\/127\.0\.0\.1:\$\{config\.uiPort\}`/);
  assert.doesNotMatch(server, /config\.remoteOnly \? "\/runpod\.html"/);
});
