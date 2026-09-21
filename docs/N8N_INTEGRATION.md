# n8n Integration

BONKAGEDDON can notify n8n when a run is submitted from the Game Over or Victory overlay.

## Setup

1. Import `n8n/bonkageddon-run-workflow.json` into n8n.
2. Activate the workflow.
3. Copy the production webhook URL.
4. Set `VITE_N8N_WEBHOOK_URL` in `.env`.
5. Restart the Vite dev server.

If `VITE_N8N_WEBHOOK_URL` is empty, the game still runs and JSON Server score saving still works. The overlay shows `n8n not configured` with the computed classification.

## Runtime Behavior

- JSON Server score persistence and n8n notification use separate guards.
- A successful score save is not repeated by rerenders.
- A successful webhook send is not repeated by retrying a failed score save.
- n8n failures are shown as a small notice and never block gameplay.

## Importable Workflow

The workflow chain is:

`Webhook -> Validate and Normalize -> Run Analysis -> Classify Run -> Action -> Respond to Webhook`

The `Classify Run` switch supports:

- `LEGENDARY`
- `HIGH_SCORE`
- `NORMAL_RUN`

## Integration Dependency

Boss spawn and boss death audio are owned by `src/scene/EnemyManager.tsx`, which this workstream must not edit. The minimal future hook is:

```ts
gameAudio.play("bossSpawn");
gameAudio.play("victory");
```

Add those calls at the existing boss spawn and boss defeat transition points, or expose those events to an owned manager.
