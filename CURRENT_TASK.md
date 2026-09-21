# Current Task

## Objective
Endless rounds + recovery system + movement jitter fix.

## Status
Completed & Verified.

## Scope Completed
1. **Separated Level and Round**:
   - Level remains XP-driven player progression and upgrade selection.
   - Round drives enemy wave pacing, composition/scaling, and boss spawning.
   - Normal enemy difficulty decoupled from player level.

2. **Endless Rounds Progression**:
   - Starts at Round 1.
   - Finite enemy quotas (14 to 40) per round with 3.5s wave intermissions.
   - Round completes after quota spawned and remaining enemies defeated.

3. **Tiered Boss Every 10 Rounds**:
   - Rounds 10, 20, 30, 40... spawn Bonklord with tier scaling (`bossTier = round / 10`).
   - Boss defeat awards guaranteed major recovery drops and advances to next round without triggering `victory`.
   - Run finishes only through player death or exiting.

4. **Movement & Camera Jitter Fix**:
   - Replaced raw frame-to-frame physics velocity estimation with low-pass filtered lookahead damping.
   - Applied tangential velocity deflection at arena perimeter to eliminate boundary bouncing and snapping.

5. **Shield System**:
   - `shield` (up to 100 max, 0 at start): mitigated incoming damage is absorbed by shield first, overflow damages health.

6. **Recovery System & Optimized Assets**:
   - Extracted and registered WebP items: `medkit-emergency` (+35 HP), `medkit-case` (+70 HP), `shield-potion` (+25 shield), `shield-battery` (+50 shield).
   - Contact-based collection with consumption guards (no pickup at full HP/shield).
   - Weighted drops from normal enemies; guaranteed high-tier rewards from boss.

7. **HUD Enhancements**:
   - Added Round indicator with boss flame styling on boss rounds.
   - Added Shield bar/value alongside HP, Level, XP, Score, and Kills.
   - Added Intermission status banner.

8. **Documentation Cleanup**:
   - Updated `AGENTS.md`, `PROJECT_STATUS.md`, and `docs/DECISIONS.md` (ADR-018).

## Validation
- `npm run lint` -> 0 errors, 0 warnings
- `npm run build` -> production build exit 0
