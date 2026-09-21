# n8n Integration

BONKAGEDDON can notify n8n when a Game Over or Victory run is submitted. JSON Server score persistence remains independent of n8n.

## Workflow File

Import:

`n8n/bonkageddon-run-workflow.json`

Workflow path:

- Test URL path: `/webhook-test/bonkageddon/run-completed`
- Production URL path: `/webhook/bonkageddon/run-completed`

## Setup

1. Open n8n.
2. Import `n8n/bonkageddon-run-workflow.json`.
3. Open the `Webhook` node.
4. For a one-off manual test, copy the Test URL.
5. For the game, activate the workflow and copy the Production URL.
6. Set `VITE_N8N_WEBHOOK_URL` in `.env` to the full URL copied from n8n.
7. Restart the Vite dev server after changing `.env`.
8. Complete one Game Over or Victory run and submit the score.

If `VITE_N8N_WEBHOOK_URL` is empty or n8n is offline, the game still runs and JSON Server score saving still works. The overlay reports the webhook status separately.

## Verified Workflow Structure

The importable JSON has this structure:

`Webhook -> Validate and Normalize -> Payload Valid?`

Valid branch:

`Payload Valid? -> Run Analysis -> Classify Run -> Legendary/High Score/Normal Action -> Respond to Webhook`

Invalid branch:

`Payload Valid? -> Invalid Payload Response`

The workflow validates the completed-run payload, accepts the current characters (`bonk`, `byte`, `tank`, `nova`, `hex`), recomputes classification, and returns HTTP `400` with JSON errors for invalid payloads.

## Runtime Behavior

- JSON Server score persistence and n8n notification use separate frontend guards.
- A successful score save is not repeated by rerenders.
- A successful webhook send is not repeated by retrying a failed score save.
- n8n failures are nonfatal and never block gameplay.

## Live Execution Status

This repository contains a valid importable workflow and documented payload contract. A live n8n execution still requires the user's actual n8n instance, an activated workflow, and `VITE_N8N_WEBHOOK_URL` configured with that instance's Production URL.

Do not claim a successful live n8n run or screenshot unless it was executed in a real n8n instance.
