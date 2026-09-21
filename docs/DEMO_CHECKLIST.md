# Demo Checklist

1. Open Home: show BONKAGEDDON title and navigation.
2. Open Characters: show GET-loaded BONK/BYTE/TANK cards.
3. Choose BONK, BYTE, or TANK: URL becomes `/game/:characterId`.
4. Move with WASD or arrow keys.
5. Point out enemies spawning in the arena.
6. Wait for automatic weapon attack.
7. Collect XP gems.
8. Trigger level-up.
9. Pick one upgrade card.
10. Use HUD audio mute/volume control.
11. Reach Game Over or Victory.
12. Enter handle and submit score: JSON Server receives POST `/scores`.
13. Open Leaderboard: show GET `/scores` result.
14. Configure `VITE_N8N_WEBHOOK_URL`, restart Vite, submit one run.
15. In n8n, show the Webhook execution, `Payload Valid?`, classification branch, action node, and JSON response.
16. Optional hardening check: send an invalid payload and show `Invalid Payload Response`.
17. Capture the n8n workflow screenshot.

## Quick Evidence

- `useState`: `src/pages/Characters.tsx:15-17`, `src/components/game/GameOverOverlay.tsx:27-31`
- `useEffect`: `src/pages/Characters.tsx:41-48`, `src/pages/Game.tsx:36-56`
- `useRef`: `src/pages/Game.tsx:21-28`, `src/scene/EnemyManager.tsx:76-92`
- `GET`: `src/services/api.ts:8-13`, `src/services/api.ts:30-35`
- `POST`: `src/services/api.ts:41-56`, `src/services/webhook.ts:50-77`
- Routing: `src/routes/Routing.tsx:20-26`
- Dynamic route: `src/routes/Routing.tsx:23`, `src/pages/Game.tsx:18`
- Reusable component: `src/components/characters/CharacterCard.tsx:6-22`
- Loading/error UI: `src/components/ui/LoadingState.tsx`, `src/components/ui/ErrorState.tsx`
- Playable scene: `src/scene/GameScene.tsx:43-76`
- n8n workflow: `n8n/bonkageddon-run-workflow.json` (`Payload Valid?`, `Classify Run`, success/failure responses)
