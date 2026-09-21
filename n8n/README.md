# n8n Automation Architecture

This directory is reserved for the future n8n workflow integration in BONKAGEDDON.

## Scheduled Scope (Future Phase)
During the endgame integration phase, the React frontend will trigger a webhook upon run completion to submit:
- Player handle
- Selected survivor
- Final score & level reached
- Enemies eliminated
- Total survival duration

## Planned n8n Workflow Nodes
1. **Webhook Trigger**: Receives JSON payload from frontend `saveScore` submission.
2. **Data Transformation / Score Validation**: Cleans and computes rank thresholds.
3. **Branching Logic (If/Else)**:
   - High Score branch (Top tier survival)
   - Standard Run branch
4. **Final Action Node**: Logs the achievement to an external ledger or notification endpoint.

> [!NOTE]
> No fake workflows or dummy JSON files have been created in this phase. The active workflow export (`bonkageddon-workflow.json`) and screenshot will be placed here when n8n integration is executed.
