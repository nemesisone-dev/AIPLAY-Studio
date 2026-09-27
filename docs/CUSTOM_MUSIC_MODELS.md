# Custom music models

AIPLAY can train an ACE-Step 1.5 LoRA from several songs on this computer or on a connected RunPod. Use recordings you own or have permission to train on.

## RunPod

1. Start AIPLAY in **RunPod GPU** mode and open its RunPod settings.
2. Press **Create private templates**. Choose **AIPLAY Custom Music Model** in RunPod and deploy it on a 24 GB or larger NVIDIA GPU.
3. Open JupyterLab. Set `AIPLAY_WORKER_TOKEN` to the worker token shown by AIPLAY, clone the AIPLAY repository if needed, and run `bash scripts/runpod-custom-model.sh` as shown in the template README.
4. Connect AIPLAY to the Pod's port 8787 worker URL.
5. Open **More tools > Training**, choose **RunPod**, name the model, choose Library songs or add audio files, and press **Create dataset**.
6. Press **Prepare songs**. When preparation reports ready, press **Start training**.

Keep the Pod running until training is complete. The adapter is saved in the Pod's `ComfyUI/models/loras` folder and appears in the Music screen's ACE-Step LoRA picker. Stopping a Pod stops GPU billing, but ordinary Pod storage can continue to cost a small amount until that storage is removed.

## This PC

1. Install [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) and its dependencies.
2. In the ACE-Step folder, run `uv run acestep-api`. It listens on `http://127.0.0.1:8001` by default.
3. Open **More tools > Training**, choose **This PC**, and follow the same dataset steps.

Set `AIPLAY_ACE_URL` before starting AIPLAY only if the local ACE-Step API uses another loopback port. Local training needs enough supported GPU memory; the official guide gives 16 GB as a practical minimum and recommends 20 GB or more.

## Preparing the songs

- MP3, WAV, FLAC, OGG and Opus are accepted.
- Add a short description of the sound the tracks share. AIPLAY writes it beside each song as ACE-Step training metadata.
- Mark **All instrumental** only when every selected track has no vocals.
- ACE-Step's guide uses about 800 epochs as a reference for 10 to 20 songs. It is a starting point, not a guarantee of quality.

Preparation creates reusable tensors. Training writes checkpoints, then AIPLAY copies the newest completed adapter to `models/loras`. The original songs, tensors and checkpoints remain in the training workspace until the custom model entry is deleted.
