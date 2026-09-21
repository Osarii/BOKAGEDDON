# BONKAGEDDON n8n Workflow

Import `bonkageddon-run-workflow.json` into n8n and copy the production webhook URL into:

```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-host/webhook/bonkageddon/run-completed
```

No paid external service is required. The workflow receives a completed run, validates and normalizes it, analyzes the run, branches by classification, assigns an action, and responds to the game.

## Nodes

1. `Webhook`
2. `Validate and Normalize`
3. `Run Analysis`
4. `Classify Run`
5. `Legendary Action`
6. `High Score Action`
7. `Normal Run Action`
8. `Respond to Webhook`

See `PAYLOAD_CONTRACT.md` for the request shape and classification rules.
