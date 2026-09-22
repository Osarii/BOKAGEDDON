/**
 * BONKAGEDDON — Headless Performance Audit Harness (v1.3)
 *
 * Connects to Brave/Chromium via CDP, navigates to the game (/game/bonk?qa=1),
 * queries hardware-accelerated WebGL info, triggers the QA performance suite,
 * and polls window.__BONK_PERF__.getAllReports() until all 13 runs complete.
 *
 * Prerequisites
 * -------------
 * 1. Start JSON Server (character API):
 *      npm run api
 * 2. Start the Vite dev server:
 *      npm run dev -- --port 5188 --host 127.0.0.1
 * 3. Run this script:
 *      node tools/dev/run_audit_headless.mjs
 *
 * Note: The full suite is 13 runs × (1.5 s warmup + 10 s measure) ≈ 150 s.
 * Allow at least 5 minutes total.
 */

import CDP from "chrome-remote-interface";
import { execFile } from "child_process";
import os from "os";

const GAME_URL       = "http://127.0.0.1:5188/game/bonk?qa=1";
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
  console.log("[harness] Launching Brave headless (hardware WebGL enabled)...");
  // NOTE: --disable-gpu is intentionally omitted to allow the normal hardware-accelerated WebGL path.
  const brave = execFile(getBravePath(), [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-sandbox",
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

  console.log(`[harness] Navigating to ${GAME_URL}...`);
  await Page.navigate({ url: GAME_URL });
  await Page.loadEventFired();
  // Extra wait for React hydration and WebGL init
  await new Promise((r) => setTimeout(r, 4000));

  // Wait for __BONK_PERF__ hook (registered by devPerformance.ts in DEV mode)
  console.log("[harness] Waiting for __BONK_PERF__ hook...");
  await Runtime.evaluate({
    expression: `new Promise((res, rej) => {
      const t0 = Date.now();
      const tick = () => {
        if (typeof window.__BONK_PERF__ !== "undefined") return res(true);
        if (Date.now() - t0 > 25000) return rej(new Error("__BONK_PERF__ not found"));
        setTimeout(tick, 300);
      };
      tick();
    })`,
    awaitPromise: true,
    timeout: 30000,
  });
  console.log("[harness] Hook ready.");

  // Inspect WebGL adapter info
  try {
    const glInfo = await cdpEval(Runtime, `
      (() => {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") || c.getContext("webgl");
        if (!gl) return { vendor: "none", renderer: "none", version: "none" };
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION)
        };
      })()
    `);
    console.log(`[harness] WebGL Vendor:   ${glInfo?.vendor}`);
    console.log(`[harness] WebGL Renderer: ${glInfo?.renderer}`);
    console.log(`[harness] WebGL Version:  ${glInfo?.version}`);
  } catch (e) {
    console.warn("[harness] Could not query WebGL info:", e.message);
  }

  // Clear any previous reports
  await cdpEval(Runtime, "window.__BONK_PERF__.clearReports(); true");

  // Allow overlay dynamic import to finish
  await new Promise((r) => setTimeout(r, 1000));

  // Send F8 just in case overlay is closed
  await Input.dispatchKeyEvent({ type: "keyDown", key: "F8", code: "F8", keyCode: 119, windowsVirtualKeyCode: 119 });
  await Input.dispatchKeyEvent({ type: "keyUp",   key: "F8", code: "F8", keyCode: 119, windowsVirtualKeyCode: 119 });
  await new Promise((r) => setTimeout(r, 600));

  // Trigger the suite: try button click first, then direct window hook
  const triggerResult = await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const suite = btns.find(b => b.textContent && b.textContent.includes("Run Full Suite"));
        if (suite) {
          suite.click();
          return "CLICKED_BUTTON";
        }
        if (typeof window.__BONK_RUN_FULL_SUITE__ === "function") {
          window.__BONK_RUN_FULL_SUITE__();
          return "TRIGGERED_VIA_HOOK";
        }
        return "NOT_FOUND";
      })()
    `,
    returnByValue: true,
  });

  if (triggerResult.result.value === "NOT_FOUND") {
    console.error("[harness] Could not find 'Run Full Suite' button or hook. Value:", triggerResult.result.value);
    await client.close();
    brave.kill();
    process.exit(1);
  }
  console.log(`[harness] Suite started via: ${triggerResult.result.value} — ${SUITE_RUNS} runs × ~11.5 s each ≈ 150 s total.`);

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
  console.log("\n=== BONKAGEDDON PERFORMANCE AUDIT V1.3 RESULTS ===\n");
  console.log("| Scenario | Target Foes | Avg Foes | Min Foes | Max Foes | Avg FPS | p99/1%-low eq FPS | Avg Frame Time | Max Frame Time | Event Hitch | Draw Calls | Triangles | Particles | DPR | Heap MB |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of reports) {
    console.log(
      `| ${r.scenarioName} | ${r.targetEnemies} | ${r.enemiesAvg} | ${r.enemiesMin} | ${r.enemiesMax} | **${r.avgFps}** | **${r.onePercentLowFps}** | ${r.avgFrameTimeMs} ms | ${r.maxFrameTimeMs} ms | ${r.eventHitchMs != null ? `${r.eventHitchMs} ms` : "N/A"} | ${r.drawCallsAvg} | ${Number(r.trianglesAvg).toLocaleString()} | ${r.particlesAvg} | ${r.dpr} | ${r.memoryMb ?? "N/A"} |`
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
