# Suite C — MODEL_SPEC v1.3

## Mission
Termux runners and one-shots for Android-based ops (sync, commits, bootstrap).

## Inputs
- Git/GitHub: GH_OWNER, SSH key on device, optional GH_TOKEN
- Webhook fallbacks: ZAPIER_HOOK_URL (optional)

## Outputs
- Local scripts; triggers remote workflows via gh.

## Workflows
- release-verify.yml, secrets-watch.yml, ops-monitor.yml

## Guardrails
- set -euo pipefail; no --force; logs to ~/.local/var/log/*.log
