import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { createAceTraining } from "./ace-training.js";

const reply = data => new Response(JSON.stringify({ data, code: 200, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });

test("ACE custom model prepares a multi-song dataset, trains and adopts its LoRA", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aiplay-ace-training-"));
  const source = path.join(root, "library"), loras = path.join(root, "loras"), training = path.join(root, "training");
  await mkdir(source); await writeFile(path.join(source, "library song.wav"), Buffer.from("library-audio"));
  const requests = []; let preprocessDone = false, trainingDone = false;
  const fetchFn = async (url, init = {}) => {
    const route = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : null; requests.push({ route, body });
    if (route === "/health") return reply({ status: "ok" });
    if (route === "/v1/dataset/scan") return reply({ samples: 2 });
    if (route === "/v1/dataset/preprocess_async") return reply({ task_id: "prepare-1" });
    if (route === "/v1/dataset/preprocess_status/prepare-1") return reply({ status: preprocessDone ? "completed" : "running", progress: "2 / 2" });
    if (route === "/v1/training/start") return reply({ run_id: "train-1" });
    if (route === "/v1/training/status") return reply({ is_training: !trainingDone, status: trainingDone ? "Completed" : "Training", current_step: 3 });
    if (route === "/v1/training/stop") return reply({ message: "stopping" });
    return new Response(JSON.stringify({ error: "unknown" }), { status: 404 });
  };
  const service = await createAceTraining({ rootDir: training, lorasDir: loras, fetchFn });
  t.after(async () => rm(root, { recursive: true, force: true }));

  let model = await service.create({ name: "Warm Soul", style: "warm soul vocals", instrumental: false });
  model = await service.addLibrary(model.id, ["library song.wav"], source);
  model = await service.upload(model.id, "upload.flac", Readable.from(Buffer.from("upload-audio")));
  assert.equal(model.files.length, 2);
  assert.equal(await readFile(path.join(training, model.id, "audio", "01_library_song.wav.caption.txt"), "utf8"), "warm soul vocals");

  const prepared = await service.prepare(model.id);
  assert.equal(prepared.model.stage, "preparing");
  preprocessDone = true;
  assert.equal((await service.check(model.id)).model.stage, "ready");
  const started = await service.start(model.id, { epochs: 900, rank: 32, gradientCheckpointing: true });
  assert.equal(started.model.stage, "training");
  assert.deepEqual(requests.find(row => row.route === "/v1/training/start").body, {
    tensor_dir: path.join(training, model.id, "tensors"), lora_rank: 32, lora_alpha: 64, lora_dropout: 0.1,
    learning_rate: 0.0001, train_epochs: 900, train_batch_size: 1, gradient_accumulation: 4,
    save_every_n_epochs: 50, training_shift: 3, training_seed: 42,
    lora_output_dir: path.join(training, model.id, "output"), use_fp8: false, gradient_checkpointing: true,
  });
  await writeFile(path.join(training, model.id, "output", "adapter.safetensors"), Buffer.from("adapter"));
  trainingDone = true;
  const completed = await service.check(model.id);
  assert.equal(completed.model.stage, "complete");
  assert.equal(completed.model.result.name, "mine_Warm_Soul.safetensors");
  assert.deepEqual(await readFile(path.join(loras, completed.model.result.name)), Buffer.from("adapter"));
});

test("ACE custom model validates names, formats and lifecycle", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aiplay-ace-validation-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const service = await createAceTraining({ rootDir: path.join(root, "training"), lorasDir: path.join(root, "loras"),
    fetchFn: async () => reply({ status: "ok" }) });
  await assert.rejects(service.create({ name: "!!!" }), /name/);
  const model = await service.create({ name: "test" });
  await assert.rejects(service.upload(model.id, "notes.txt", Readable.from("x")), /MP3/);
  await assert.rejects(service.prepare(model.id), /at least one song/);
  await assert.rejects(service.check("outside"), /Invalid custom model ID/);
});
