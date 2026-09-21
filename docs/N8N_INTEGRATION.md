# n8n Integration

BONKAGEDDON can notify n8n when a run is submitted from the Game Over or Victory overlay.

## Setup

1. Import `n8n/bonkageddon-run-workflow.json` into n8n.
2. Open the `Webhook` node.
3. For a temporary classroom test, copy the **Test URL** and click **Listen for test event**.
4. For repeated game submissions, activate the workflow and copy the **Production URL**.
5. Set `VITE_N8N_WEBHOOK_URL` in `.env`.
6. Restart the Vite dev server after changing `.env`.
7. Send one run by reaching Game Over or Victory and submitting the score.

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

Successful response shape:

```json
{
  "ok": true,
  "classification": "HIGH_SCORE",
  "action": "mark_high_score_candidate",
  "badge": "HIGH SCORE",
  "summary": "Player posted a high-score run: 12000 points.",
  "receivedAt": "2026-09-21T00:00:00.000Z"
}
```

JSON Server remains independent. Verify the leaderboard still updates from `POST /scores` even if n8n is not configured or temporarily fails.

## Screenshot Requirement

The repository does not include a fabricated n8n screenshot. For submission, capture the actual imported n8n workflow canvas showing:

- `Webhook`
- `Validate and Normalize`
- `Run Analysis`
- `Classify Run`
- the three action branches
- `Respond to Webhook`

This requires the user's real n8n instance.

## Integration Dependency

Boss spawn and boss death audio are owned by `src/scene/EnemyManager.tsx`, which this workstream must not edit. The minimal future hook is:

```ts
gameAudio.play("bossSpawn");
gameAudio.play("victory");
```

Add those calls at the existing boss spawn and boss defeat transition points, or expose those events to an owned manager.
