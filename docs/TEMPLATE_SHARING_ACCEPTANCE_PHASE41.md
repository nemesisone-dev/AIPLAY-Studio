# Phase 4.1: two-user template sharing acceptance

Date: 24 October 2026. Base: Nemesis
`5df2b9077e0b2335ec3a8384443203e7efd48b62`.

## Result and scope

User A saved the accepted XL-SFT instrumental preset through Music, exported it
through Creative templates, and User B imported that exact file into a separate
offline AIPLAY instance. Loading restored the ordinary Music form exactly.
User B's subsequent export is byte-identical to User A's.

The core sharing flow already worked. Acceptance found a real first-open
installation-review bug: lazy planner mounting lost the requested RunPod target
and showed My Computer with additional categories. That handoff is now fixed.
The preview also exposes its existing compatibility assessment and required
companion files, with file details collapsed by default. No gallery, schema
change, registry, backend or inference engine was added.

This is software acceptance using synthetic workers and tiny synthetic files.
It does not repeat GPU inference or validate actual installed model weights.
Existing A100 hardware evidence remains unchanged.

## Isolation and procedure

The existing offline fixture was run as two separate Node processes with freshly
created app-data, credential-vault, rig, input, output, model and worker-state
directories. Different loopback origins isolate browser storage:

| Profile | Application | Synthetic engine |
|---|---|---|
| User A | `http://127.0.0.1:4471` | port 4473 |
| User B | `http://127.0.0.1:4481` | port 4483 |

The workers have distinct synthetic resource identifiers and runtime identities.
The two instances share source code and the explicitly transferred JSON file,
not application state. Both run in RunPod launch mode. Only synthetic credentials
were seeded in these isolated stores; the user's installation and vault were
not used or changed. Provider reads are mocked and external worker requests are
blocked by the original fixture. No real RunPod requests or model downloads occur.

1. User A opened Music and selected its existing 30-second A100 reference preset.
2. User A clicked **Save as template**, named it
   **Shared XL-SFT instrumental reference**, saved and exported it.
3. The exported JSON passed the existing runtime validator and matched all four
   pinned companion identities in `shared/model-bundles.js`.
4. User B's template store was initially empty. **Import template** opened the
   original file, displayed its preview and kept saving as a separate action.
5. The preview retained the model/workflow identity, experimental status,
   unverified current installation and historical A100 evidence distinction.
6. **Load into form** used the existing Music selection and form handlers.
   User B's previous duration/seed/step values were replaced by the shared values.
7. **Review installation**, on a previously unopened planner, was tested before
   and after the fix. The final planner keeps RunPod and Music only.
8. Changing the preview location to My Computer and back remained a planning
   choice; the active application stayed in RunPod mode.
9. User B exported the imported template again. Both file bytes and hashes match.

User B's import/load did not silently save a new library entry: the template
store remained empty until an explicit Save action. User A's store retained its
one saved template and was not modified by User B.

## Exact settings and identities

| Setting | Exported by A and restored in B |
|---|---|
| Model | `acestep_v1.5_xl_sft_bf16.safetensors` |
| Precision | BF16, identified by the exact selected artifact |
| Planner | `qwen_4b_ace15.safetensors` |
| Mode | Instrumental |
| Lyrics | Empty string |
| Duration | 30 seconds |
| Steps | 50 |
| CFG | 7 |
| Seed | 20261019 |
| Tempo / key / meter | 120 BPM / C major / 4 |
| Language | `en` |
| Planner codes / temperature | Enabled / 0.85 |

The caption is unchanged:

> Instrumental electronic music, 120 BPM, warm synthesizer chords, clear drum groove, evolving bass line, no vocals.

Required artifact identities are preserved for the DiT, ACE VAE,
`qwen_0.6b_ace15.safetensors` lyric encoder and 4B planner. Exact byte sizes,
SHA-256 values and workflow key are recorded in the portable examples.

Both exported files have SHA-256:

`37e9398cceae1dc88a6a45622663bdb72751dbd8866649be4fc5a810ee4a415c`

## Security and side-effect verification

- The exported schema contains model references and creative settings only.
  No credentials, tokens, private paths, Pod IDs, worker URLs, internal store
  UUIDs, timestamps or current-machine information are present.
- The authoritative validator accepted the export. Companion names, sizes and
  SHA-256 values match the existing pinned shared manifest exactly.
- HTTP instrumentation records API paths/methods without request bodies or
  credentials. Neither profile requested model installation, provider resource
  mutation, credential changes or generation through the relevant endpoints.
- Both synthetic generation counters are zero, queues/output directories are
  empty and provider action lists are empty. The four tiny synthetic model
  payloads remain byte-identical to their fixture contents.
- Both applications still report RunPod launch mode. Only existing form and
  setup-plan preferences changed when explicitly loading/reviewing the template.
- Current-worker inference readiness remains unverified in the import preview.
  A historical A100 result does not establish current installation or hardware
  compatibility. Local and unchecked RunPod hardware remain unknown where the
  existing compatibility planner cannot substantiate a fit.

## Necessary fixes

`web/setup-plan.js` now provides an awaited opening helper for the existing
planner. It mounts before the disclosure's lazy toggle can race the target
handoff, then requests the reviewed target with `carry: false`. Templates and
the existing curated browser reuse this helper. No installer or provider action
is added to the helper.

The template preview displays location-specific labels from the existing
`FIT_STATES` vocabulary and provides **Required model files** using the plan's
existing file list. That disclosure starts closed. Historical acceptance,
current installation and execution compatibility remain separate.

## Tests and visual acceptance

253 focused tests passed, covering templates, model library, setup planning,
ACE/Music, existing provider UI and transport, guarded lifecycle behavior,
installation, model management, storage and watchdog regressions.

Three added regressions verify independent user stores, delayed cold/already
mounted planner handoffs, and authoritative compatibility/companion preview
rendering with collapsed details. Existing malformed/private-data, companion,
workflow, precision, effective-step and generation-provider assertions remain.

The complete mandatory repository gate uses the established isolated CPU Python
environment. Standalone and normal commit-hook logs/results are preserved under
`tmp/cloud-manager/template-sharing-acceptance/`. Publication occurs only after
the final mandatory gate succeeds. No tests are bypassed or weakened.

At 1280px and 700px, import fields, location selector, preview, Load and export
controls are usable. Long companion filenames wrap; there is no horizontal
document overflow at 700px. The final browser error log is empty.

## Evidence and reproduction

`docs/evidence/template-sharing-phase41/` contains both exported files,
the exact restored form values and counter results, before/after planner
handoffs, and desktop/700px screenshots. The runner reuses the original fixture:

```powershell
.\node\node.exe docs/evidence/template-sharing-phase41/profile-fixture.mjs A
# In another terminal, from the same repository root:
.\node\node.exe docs/evidence/template-sharing-phase41/profile-fixture.mjs B
```

Use the ordinary UI steps above; stop both test processes afterwards. These
fixtures use independent temporary directories and fake provider data. Their
synthetic models are not executable neural-network weights.
