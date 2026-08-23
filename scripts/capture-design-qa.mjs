import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9333;
const viewportWidth = Number(process.env.QA_WIDTH ?? 1265);
const viewportHeight = Number(process.env.QA_HEIGHT ?? 712);
const output = resolve(process.env.QA_OUTPUT ?? "design-qa-assets/home-implementation-final-02.png");
const profile = resolve(tmpdir(), `zhiyu-design-qa-browser-${Date.now()}`);
const captureId = process.env.FIGMA_CAPTURE_ID;
const appUrl = "http://localhost:3000";
const browser = spawn(edge, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  `--window-size=${viewportWidth},${viewportHeight}`,
  "--hide-scrollbars",
  "--disable-gpu",
  appUrl,
], { stdio: "ignore" });

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function getPage() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Edge is still starting.
    }
    await sleep(250);
  }
  throw new Error("Unable to connect to the design QA browser.");
}

const page = await getPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolvePromise, reject) => {
  socket.addEventListener("open", resolvePromise, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve: resolvePromise, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolvePromise(message.result);
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolvePromise, reject) => pending.set(id, { resolve: resolvePromise, reject }));
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(1200);

  const studentId = String(Date.now()).slice(-12);
  await send("Runtime.evaluate", {
    expression: `fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: '${studentId}', name: '演示同学', password: 'DesignQA2026!' }) })`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (captureId) {
    const endpoint = encodeURIComponent(`https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`);
    await send("Page.navigate", {
      url: `${appUrl}/#figmacapture=${captureId}&figmaendpoint=${endpoint}&figmadelay=1500`,
    });
    await sleep(6000);
    const diagnostics = await send("Runtime.evaluate", {
      expression: "({ hash: location.hash, figma: typeof window.figma, capture: typeof window.figma?.captureForDesign, script: document.querySelector('script[src*=\"mcp.figma.com\"]')?.src })",
      returnByValue: true,
    });
    console.log(JSON.stringify(diagnostics.result.value));
    await send("Runtime.evaluate", {
      expression: `window.figma.captureForDesign({ captureId: '${captureId}', endpoint: 'https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true', selector: 'body' })`,
      awaitPromise: true,
      returnByValue: true,
    });
    await sleep(14000);
  } else {
    await send("Page.reload", { ignoreCache: true });
    await sleep(1800);
  }
  await send("Runtime.evaluate", {
    expression: "window.scrollTo(0, 0); document.activeElement?.blur();",
    awaitPromise: true,
  });
  await sleep(500);

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await mkdir(resolve("design-qa-assets"), { recursive: true });
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  console.log(output);
} finally {
  socket.close();
  browser.kill();
}
