/*
 * IQRAFI demo launcher (packaged into IQRAFI.exe as a Node.js single executable application).
 *
 * Starts the bundled IQRAFI server with its embedded demo database, then opens the browser.
 * Everything stays on this computer; other people on the same network can join using the
 * "network" address printed below.
 */
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const net = require("node:net");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");

const baseDir = path.dirname(process.execPath);
const appDir = path.join(baseDir, "app");
const dataRoot = path.join(process.env.LOCALAPPDATA || baseDir, "IQRAFI-Demo");
const dbDir = path.join(dataRoot, "database");

function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  console.log("\n" + "=".repeat(width));
  for (const l of lines) console.log("  " + l);
  console.log("=".repeat(width) + "\n");
}

function freePort(start) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const srv = net.createServer();
      srv.once("error", () => tryPort(port + 1));
      srv.once("listening", () => srv.close(() => resolve(port)));
      srv.listen(port, "0.0.0.0");
    };
    tryPort(start);
  });
}

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === "IPv4" && !a.internal) return a.address;
  }
  return null;
}

function waitUntilReady(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/api/stats", timeout: 5000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on("error", retry);
      req.on("timeout", () => req.destroy());
    };
    const retry = () => (Date.now() > deadline ? reject(new Error("IQRAFI did not start in time")) : setTimeout(attempt, 1000));
    attempt();
  });
}

function openBrowser(url) {
  const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* the URL is printed in the window as well */
  }
}

async function main() {
  if (!fs.existsSync(path.join(appDir, "server.js"))) {
    console.error(`Could not find the IQRAFI app folder next to this program:\n  ${appDir}\nPlease keep IQRAFI.exe and the "app" folder together.`);
    return pause(1);
  }
  if (process.argv.includes("--reset")) {
    fs.rmSync(dbDir, { recursive: true, force: true });
    console.log("Demo database reset. It will be recreated with fresh demo data.");
  }
  fs.mkdirSync(dataRoot, { recursive: true });
  const firstRun = !fs.existsSync(dbDir);

  const port = await freePort(3000);
  const lan = lanAddress();
  const localUrl = `http://localhost:${port}`;
  const networkUrl = lan ? `http://${lan}:${port}` : null;

  Object.assign(process.env, {
    NODE_ENV: "production",
    IQRAFI_DEMO: "1",
    PORT: String(port),
    HOSTNAME: "0.0.0.0",
    DATABASE_URL: `pglite:${dbDir}`,
    // Invitation links use the network address so other people on the same Wi-Fi can open them.
    APP_URL: networkUrl || localUrl,
    CRON_SECRET: crypto.randomBytes(24).toString("hex"),
    NEXT_TELEMETRY_DISABLED: "1",
  });

  banner([
    "IQRAFI — Read. Complete. Together.   (demo build)",
    "",
    firstRun ? "First start: preparing the demo database (about a minute)..." : "Starting...",
    "Keep this window open while testing. Close it to stop IQRAFI.",
  ]);

  process.chdir(appDir);
  createRequire(path.join(appDir, "server.js"))("./server.js");

  try {
    await waitUntilReady(port, 5 * 60_000);
  } catch (e) {
    console.error(String(e));
    return pause(1);
  }
  banner([
    "IQRAFI is running.",
    "",
    `On this computer:      ${localUrl}`,
    networkUrl ? `Same Wi-Fi/network:    ${networkUrl}` : "Network address unavailable (offline).",
    "",
    "Demo accounts (password: demo-password-123)",
    "  ahmed@demo.iqrafi.com   (group owner + admin dashboard)",
    "  sara@  ali@  fatima@  yusuf@demo.iqrafi.com",
    "Or create your own account and Khatma.",
    "",
    "Data is stored in: " + dbDir,
    'To start over with fresh demo data, run:  IQRAFI.exe --reset',
  ]);
  openBrowser(localUrl);
}

function pause(code) {
  console.log("\nPress Enter to close this window.");
  process.stdin.resume();
  process.stdin.once("data", () => process.exit(code));
}

main().catch((e) => {
  console.error("IQRAFI could not start:", e);
  pause(1);
});
