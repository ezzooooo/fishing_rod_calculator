import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const port = 3101;
const origin = `http://127.0.0.1:${port}`;
const outputDirectory = resolve(projectRoot, "outputs/next-migration");
const screenshotPath = resolve(outputDirectory, "login-laptop.png");

await access(resolve(projectRoot, "out/index.html"));
await mkdir(outputDirectory, { recursive: true });

let serverOutput = "";
let serverError: Error | null = null;
let listening = false;
const server = spawn(process.execPath, [resolve(projectRoot, "scripts/serve_static.mjs")], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => {
  serverOutput = (serverOutput + String(chunk)).slice(-4000);
  if (serverOutput.includes(`Local web app: ${origin}`)) listening = true;
});
server.stderr.on("data", (chunk) => {
  serverOutput = (serverOutput + String(chunk)).slice(-4000);
});
server.on("error", (error) => { serverError = error; });
const serverExited = new Promise<void>((done) => {
  server.once("exit", () => done());
  server.once("error", () => done());
});

let browser: Browser | undefined;
const runtimeErrors: string[] = [];
const backendRequests: string[] = [];

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverError) throw serverError;
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`Static server stopped before the smoke test: ${serverOutput}`);
    }
    try {
      if (listening) {
        const response = await fetch(origin, { signal: AbortSignal.timeout(1500) });
        if (response.ok) return;
      }
    } catch {
      // The child process may not have bound its listening socket yet.
    }
    await new Promise((done) => setTimeout(done, 150));
  }
  throw new Error(`Static server did not start: ${serverOutput}`);
}

async function expectGuestGate(page: Page): Promise<boolean> {
  await page.getByRole("heading", {
    name: /^(직원 로그인|Firebase 연결 설정이 필요합니다)$/,
  }).waitFor({ state: "visible", timeout: 20000 });
  const configured = await page.getByRole("heading", { name: "직원 로그인", exact: true }).isVisible();
  assert.equal(await page.getByText("예시 데이터", { exact: true }).count(), 0, "Production must not show the preview banner");
  assert.equal(await page.getByRole("heading", { name: "새 견적 만들기", exact: true }).count(), 0, "Guests must not see the quote workspace");
  assert.equal(await page.getByRole("button", { name: "견적 저장", exact: true }).count(), 0, "Guests must not see quote save controls");
  return configured;
}

try {
  await waitForServer();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1366, height: 768 },
  });

  // This is a guest rendering test. Never allow it to contact account or staff
  // data, even if a regression accidentally starts a Firebase subscription.
  await context.route(/https:\/\/(?:firestore|identitytoolkit|securetoken)\.googleapis\.com\//, async (route) => {
    const address = new URL(route.request().url());
    backendRequests.push(`${address.host}${address.pathname}`);
    await route.abort();
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => {
    // Keep reports free of request URLs, Firebase keys or configuration values.
    runtimeErrors.push(error.name || "Error");
  });

  const rootResponse = await page.goto("/", { waitUntil: "domcontentloaded" });
  assert.equal(rootResponse?.status(), 200, "The production root must exist in the static export");
  const configured = await expectGuestGate(page);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  for (const path of ["/quotes/detail/?id=sample", "/brands/"]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200, `${path} must be directly addressable in the static export`);
    assert.equal(await expectGuestGate(page), configured, `${path} must use the same guest authentication gate`);
  }

  assert.deepEqual(runtimeErrors, [], "Production browser runtime errors");
  assert.deepEqual(backendRequests, [], "A fresh production guest must not request Firebase account or staff data");
  console.log(JSON.stringify({
    productionSmoke: "passed",
    configured,
    guestGate: configured ? "employee-login" : "firebase-configuration-required",
    routes: ["/", "/quotes/detail/?id=sample", "/brands/"],
    runtimeErrors: 0,
    screenshot: "outputs/next-migration/login-laptop.png",
  }));
} finally {
  try {
    await browser?.close();
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill("SIGTERM");
      const forceStop = setTimeout(() => server.kill("SIGKILL"), 2000);
      forceStop.unref();
      await serverExited;
      clearTimeout(forceStop);
    }
  }
}
