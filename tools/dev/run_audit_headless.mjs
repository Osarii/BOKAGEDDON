/**
 * BONKAGEDDON — Headless Performance Audit Harness (v1.1)
 *
 * Connects to Brave/Chromium via CDP, navigates to the game, presses F8 to
 * open the DevTools overlay, clicks "Run Full Suite", then polls
 * window.__BONK_PERF__.getAllReports() until all 13 runs complete.
 *
 * Prerequisites
 * -------------
 * 1. Start the Vite dev server:
 *      npm run dev -- --port 5188 --host 127.0.0.1
 * 2. Install the CDP client (DEV only, not in game bundle):
 *      npm i -D chrome-remote-interface
 * 3. Run this script:
 *      node tools/dev/run_audit_headless.mjs
 *
 * The script launches Brave headless internally; no manual browser step needed.
 *
 * Note: The full suite is 13 runs × (1.5 s warmup + 10 s measure) ≈ 150 s.
 * Allow at least 5 minutes total.
 */

import CDP from "chrome-remote-interface";
import { execFile } from "child_process";
import os from "os";

const GAME_URL       = "http://127.0.0.1:5188/game?qa=1";
const CDP_PORT       = 9222;
const SUITE_RUNS     = 13;
const SUITE_TIMEOUT  = 6 * 60 * 1000; // 6 min
const POLL_INTERVAL  = 5000; // poll every 5 s

function getBravePath() {
  switch (os.platform()) {
    case "darwin":
      return "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
    case "linux":
      return "/usr/bin/brave-browser";
    case "win32":
      return "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }
}

async function cdpEval(Runtime, expression, awaitPromise = false, timeoutMs = 30000) {
  const r = await Runtime.evaluate({ expression, awaitPromise, returnByValue: true, timeout: timeoutMs });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function main() {
  console.log("[harness] Launching Brave headless…");
  const brave = execFile(getBravePath(), [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1280,800",
    "--force-device-scale-factor=1",
    "about:blank",
  ]);
  brave.stderr.on("data", () => {});

  await new Promise((r) => setTimeout(r, 2500));

  let client;
  try {
    client = await CDP({ port: CDP_PORT });
  } catch (err) {
    console.error("[harness] CDP connection failed:", err.message);
    brave.kill();
    process.exit(1);
  }

  const { Page, Runtime, Input } = client;
  await Page.enable();
  await Runtime.enable();

  console.log(`[harness] Navigating to ${GAME_URL}…`);
  await Page.navigate({ url: GAME_URL });
  await Page.loadEventFired();
  // Extra wait for React hydration and WebGL init
  await new Promise((r) => setTimeout(r, 4000));

  // Wait for __BONK_PERF__ hook (registered by devPerformance.ts in DEV mode)
  console.log("[harness] Waiting for __BONK_PERF__ hook…");
  await Runtime.evaluate({
    expression: `new Promise((res, rej) => {
      const t0 = Date.now();
      const tick = () => {
        if (typeof window.__BONK_PERF__ !== "undefined") return res(true);
        if (Date.now() - t0 > 20000) return rej(new Error("__BONK_PERF__ not found"));
        setTimeout(tick, 300);
      };
      tick();
    })`,
    awaitPromise: true,
    timeout: 25000,
  });
  console.log("[harness] Hook ready.");

  // Clear any previous reports
  await cdpEval(Runtime, "window.__BONK_PERF__.clearReports(); true");

  // Press F8 to open the DevTools overlay (key code 119)
  await Input.dispatchKeyEvent({ type: "keyDown", key: "F8", code: "F8", keyCode: 119 });
  await Input.dispatchKeyEvent({ type: "keyUp",   key: "F8", code: "F8", keyCode: 119 });
  await new Promise((r) => setTimeout(r, 500));

  // Click the "Run Full Suite" button by finding it in the DOM
  const clickResult = await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const suite = btns.find(b => b.textContent && b.textContent.includes("Run Full Suite"));
        if (!suite) return "BUTTON_NOT_FOUND";
        suite.click();
        return "CLICKED";
      })()
    `,
    returnByValue: true,
  });
  if (clickResult.result.value !== "CLICKED") {
    console.error("[harness] Could not find 'Run Full Suite' button. Is the overlay open? Value:", clickResult.result.value);
    await client.close();
    brave.kill();
    process.exit(1);
  }
  console.log(`[harness] Suite started — ${SUITE_RUNS} runs × ~11.5 s each ≈ 150 s total.`);

  // Poll until all expected reports are collected or timeout
  const deadline = Date.now() + SUITE_TIMEOUT;
  let reports = [];
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const raw = await cdpEval(Runtime, "JSON.stringify(window.__BONK_PERF__.getAllReports())");
    reports = JSON.parse(raw ?? "[]");
    console.log(`[harness] Reports so far: ${reports.length} / ${SUITE_RUNS}`);
    if (reports.length >= SUITE_RUNS) break;
  }

  if (reports.length === 0) {
    console.error("[harness] No reports collected before timeout.");
    await client.close();
    brave.kill();
    process.exit(1);
  }

  // Print markdown table
  console.log("\n=== BONKAGEDDON PERFORMANCE AUDIT V1.1 RESULTS ===\n");
  console.log("| Scenario | Avg FPS | p99/1%-low eq FPS | Avg Frame Time | Max Frame Time | Draw Calls | Triangles | Enemies | Particles | DPR | Heap MB |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of reports) {
    console.log(
      `| ${r.scenarioName} | **${r.avgFps}** | **${r.onePercentLowFps}** | ${r.avgFrameTimeMs} ms | ${r.maxFrameTimeMs} ms | ${r.drawCallsAvg} | ${Number(r.trianglesAvg).toLocaleString()} | ${r.enemiesAvg} | ${r.particlesAvg} | ${r.dpr} | ${r.memoryMb ?? "N/A"} |`
    );
  }

  await client.close();
  brave.kill();
  console.log("\n[harness] Done.");
}

main().catch((err) => {
  console.error("[harness] Fatal:", err);
  process.exit(1);
});
