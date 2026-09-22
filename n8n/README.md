# BONKAGEDDON n8n Workflow

Import `bonkageddon-run-workflow.json` into n8n and copy the production webhook URL into:

```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-host/webhook/bonkageddon/run-completed
```

No paid external service is required. The workflow receives a completed run, validates and normalizes it, analyzes the run, branches by classification, assigns an action, and responds to the game.

## Nodes (10)

1. `Webhook`
2. `Validate and Normalize`
3. `Payload Valid?`
4. `Invalid Payload Response`
5. `Run Analysis`
6. `Classify Run`
7. `Legendary Action`
8. `High Score Action`
9. `Normal Run Action`
10. `Respond to Webhook`

See `PAYLOAD_CONTRACT.md` for the request shape and classification rules.
