# BONKAGEDDON n8n Workflow

Import `bonkageddon-run-workflow.json` into n8n. No paid external service or credentials are required.

## Classroom Live Demo Setup

1. Open n8n.
2. Choose **Import from File**.
3. Select `n8n/bonkageddon-run-workflow.json`.
4. Open the `Webhook` node.
5. For a one-off test, copy the **Test URL** and click **Listen for test event**.
6. For the actual game demo, activate the workflow and copy the **Production URL**.
7. In the project `.env`, set:

   ```bash
   VITE_N8N_WEBHOOK_URL=<copied n8n Test URL or Production URL>
   ```

8. Restart Vite after changing `.env`.
9. Play one run, reach Game Over or Victory, enter a handle, and submit the score.
10. A successful response in the game shows `n8n notified: LEGENDARY`, `n8n notified: HIGH_SCORE`, or `n8n notified: NORMAL_RUN`.
11. In n8n, confirm the execution passes `Payload Valid?`, enters the expected classification branch, and reaches `Respond to Webhook`.
12. Optional hardening check: send an invalid payload and confirm it reaches `Invalid Payload Response` with `ok: false`.
13. Capture the required screenshot of the imported workflow canvas and, if possible, the execution result.

JSON Server score persistence remains independent: `POST /scores` still uses `VITE_API_URL` / `http://localhost:3001`. If n8n is offline or `VITE_N8N_WEBHOOK_URL` is empty, the game should still save scores and show a nonfatal n8n notice.

## Nodes

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

## Still Requires User Instance

- Importing the workflow into the user's real n8n instance.
- Copying the user's Test URL or Production URL.
- Activating the workflow for Production URL use.
- Capturing the actual n8n screenshot for submission.
