# RunPod rendering preview

AIPLAY runs on your Windows PC. A small authenticated worker beside ComfyUI on a dedicated RunPod Pod executes workflows. Results are downloaded, SHA-256 checked, and placed in your local library. Your PC needs Node.js for AIPLAY's backend; it does not need CUDA or local model weights for this remote panel.

This is a source-level preview, not a Windows installer or a verified GPU deployment. The remote panel has automated mock integration coverage. Image, video and music templates reuse AIPLAY's graph builders, but every selected model and custom node must be installed and tested on the Pod before claiming live support.

## Start on Windows

Install Node.js 22 or newer from [Node.js](https://nodejs.org/) if it is not already available. From this checkout:

```powershell
npm ci --omit=dev
npm run start:remote
```

Open `http://127.0.0.1:4173/runpod.html`. This entry point keeps the full local UI and skips automatic local ComfyUI startup. With `AIPLAY_OPEN=1`, it opens the RunPod panel once the server is listening. The main AIPLAY navigation also has a RunPod link.

Use this panel's Render button for remote jobs. Existing image/video/music generation screens still use their original engines. Native GGUF music, mesh tools, compositor processing and final timeline export have not been connected to this worker. Local editing/export tools can still have their own CPU, media-tool or Python requirements.

## Prepare one dedicated Pod

Choose a ComfyUI environment and GPU for one specific first workflow. A model-specific API such as Seedance includes its model deployment; a rented GPU does not. Confirm current compute and storage prices in the RunPod console before deploying. This integration does not create Pods, enforce a dollar budget, or stop idle GPUs.

1. Keep ComfyUI, model weights, its `input`/`output` folders, and worker state on persistent storage. A network volume can outlive the Pod, but has separate storage charges and placement constraints. See [RunPod storage options](https://docs.runpod.io/pods/storage/types) and [network volumes](https://docs.runpod.io/storage/network-volumes).
2. Install the selected models/custom nodes and prove a small workflow directly in that ComfyUI installation first. Start with a standard SD/SDXL checkpoint image to test transport cheaply. For video/music, install the exact files and nodes referenced by the chosen graph. The remote model list and graph validation report missing names; they do not install models or prove GPU memory is sufficient.
3. Keep ComfyUI on the Pod's loopback interface, normally `127.0.0.1:8188`. Use the template's Python environment, for example `python main.py --listen 127.0.0.1 --port 8188`. Configure the template to avoid launching a second ComfyUI instance. The worker input/output directories must match ComfyUI's actual directories.
4. Install Node.js 22 or newer in the Pod. Copy this checkout there, or clone this fork's `feature/runpod-rendering` branch once it is published. The gateway itself uses only Node built-ins: no `npm install` is required on the Pod. Required source files are `worker/runpod-worker.js`, `server/engine/remote-common.js`, and a root `package.json` with `"type": "module"`.
5. Expose only worker HTTP port **8787** for rendering. Keep raw ComfyUI port 8188 private. RunPod provides an HTTPS proxy such as `https://POD_ID-8787.proxy.runpod.net`; use the actual URL from the Pod's Connect panel. Public proxy services require their own authentication, and the proxy has a 100-second response timeout. The worker returns job IDs quickly and is polled separately. [RunPod port documentation](https://docs.runpod.io/pods/configuration/expose-ports).

On the Pod, generate a worker secret once and save it outside the source checkout:

```bash
mkdir -p /workspace/aiplay-worker
chmod 700 /workspace/aiplay-worker
node --input-type=module -e 'import { randomBytes } from "node:crypto"; import { writeFileSync } from "node:fs"; writeFileSync("/workspace/aiplay-worker/worker.env", "AIPLAY_WORKER_TOKEN=" + randomBytes(32).toString("hex") + "\n", { mode: 0o600, flag: "wx" });'
```

The exclusive write refuses to overwrite an existing token. Retrieve its value privately for the local connection form. This secret is **not your RunPod account API key**. Do not commit or share it.

From the copied checkout, start the gateway with the same Node runtime:

```bash
export AIPLAY_COMFY_DIR=/workspace/ComfyUI
export AIPLAY_WORKER_STATE=/workspace/aiplay-worker
node --env-file=/workspace/aiplay-worker/worker.env worker/runpod-worker.js
```

Set this command up under the Pod template's startup supervisor for actual use, so it starts again on restart and does not depend on a browser terminal staying connected. Supervise ComfyUI separately. Do not run two worker processes against the same state directory.

| Environment variable | Default / purpose |
| --- | --- |
| `AIPLAY_WORKER_TOKEN` | Required, at least 32 characters; use a random secret |
| `AIPLAY_COMFY_DIR` | `/workspace/ComfyUI` |
| `AIPLAY_WORKER_COMFY_URL` | `http://127.0.0.1:8188`; loopback only |
| `AIPLAY_WORKER_INPUT` | ComfyUI's `input` folder |
| `AIPLAY_WORKER_OUTPUT` | ComfyUI's `output` folder |
| `AIPLAY_WORKER_STATE` | `/workspace/aiplay-worker`; retain across restarts |
| `AIPLAY_WORKER_PORT` | `8787`; gateway listens on all interfaces |

## Connect and render

Enter the worker HTTPS URL and token in the local RunPod panel. The local backend stores the token through AIPLAY's existing secret store; it is never returned by the status API. Connect checks worker identity, ComfyUI readiness and its model/node inventory.

Select a template and model, enter the prompt, and build the graph. Review the editable workflow before rendering. You can instead import a ComfyUI **API-format** workflow; the canvas-format JSON is not accepted. Templates inherit AIPLAY defaults and may need model filenames edited to match the Pod.

For reference media, expand Add reference files and choose the graph node and input that should receive each file. The local file is uploaded and that input is replaced with a Pod-relative path. Merely importing a workflow that contains a Windows filename does not upload that file.

Render records the request locally before dispatching. Jobs show queued/running/downloading and final status. Image and video results are adopted into AIPLAY's local image/clip folders; supported audio goes into its local music library. Other supported output files remain downloadable from the job. Returning to the main studio may be needed to refresh a library view.

The worker and ComfyUI must stay running for the render to progress. Closing the PC UI does not stop the GPU job or Pod billing. Reopening AIPLAY resumes polling and downloads with the original job ID. Confirm that files are on the PC before terminating or removing remote storage. Manage compute and storage in the [RunPod console](https://console.runpod.io/).

## Recovery and limits

- Both sides persist job state. Retrying a lost desktop submission response uses the same UUID. A lost ComfyUI response is reconciled against its queue/history; it is never automatically rendered again. An **uncertain** result requires checking ComfyUI before creating another job.
- Keep the same worker state directory and URL for recovery. While a job is active, you can refresh its token, but cannot switch to another worker. Recreating a Pod at a new URL while local jobs are active currently requires manual recovery; this preview does not migrate outstanding jobs between endpoints.
- Cancellation targets one job. A ComfyUI version without targeted running-job cancellation will return an error; the worker deliberately does not send a global interrupt. A queued job can be withdrawn without stopping others. Inspect the Pod if cancellation fails.
- Files are limited to 512 MiB each, workflows to 2 MiB / 500 nodes, input bindings to 30, and the worker queue to 20 active jobs. Actual proxy transfer limits may be lower. Transfers restart from the beginning after interruption; large or slow transfers may need an SSH tunnel or a future object-storage transport.
- Outputs use a frozen size/hash manifest. Keep remote files until local download succeeds. There is no automated cleanup or retention expiry yet: monitor disk usage. Restart recovery is tested; hard power-loss durability and every third-party save node are not certified.
- No live progress percentage, automatic model installer, automatic Pod lifecycle control, multi-tenant isolation, or remote timeline/export support is included. This is a personal, dedicated worker: treat its bearer token as full access to its ComfyUI environment.

## Verify without cloud charges

```powershell
npm run test:remote
```

The integration tests use temporary directories and local mock HTTP services for authentication, model validation, uploads, download verification, submission loss, restart recovery, provenance and scoped cancellation.

For a browser demonstration, run `node scripts/mock-runpod.mjs` in one terminal. It prints a public test token and listens only on `http://127.0.0.1:8788`. In a second terminal:

```powershell
$env:AIPLAY_APPDATA = Join-Path $env:TEMP 'aiplay-runpod-demo'
$env:AIPLAY_UI_PORT = '4184'
npm run start:remote
```

Open port 4184's RunPod panel, connect the printed mock URL/token, select `MOCK-NO-GPU.safetensors`, build an image graph and render. The result is a tiny fixture PNG, not AI-generated media. Keep this demo's app-data separate from your real studio, and close both processes afterward.

## First live acceptance test

Before claiming GPU support: choose the exact template/model/GPU and a test spending cap, deploy the Pod, generate a small image, verify local library adoption and hashes, then close/reopen the desktop during a second job and confirm recovery. Record container, ComfyUI/custom-node revisions, model filenames, peak memory, elapsed time and actual billing. Test a short video separately. None of those live measurements has been performed yet.
