/**
 * Builds an upload-ready Node.js package for hosts such as cPanel "Setup Node.js App"
 * (Phusion Passenger) or any Linux server:
 *
 *   dist/IQRAFI-server/            server.js (startup file) + .next + node_modules + data + drizzle
 *   dist/IQRAFI-server-linux-x64.zip
 *
 * Build it on Linux (or via the "Server package" GitHub workflow) so the native
 * password-hashing module matches the server. Usage: npm run deploy:package
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dist = path.join(root, "dist");
const out = path.join(dist, "IQRAFI-server");
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", ...opts });

if (process.platform !== "linux") console.warn("⚠ Building on a non-Linux machine: use the GitHub workflow so native modules match a Linux server.");
if (!process.argv.includes("--skip-build")) {
  run("npx next build", { env: { ...process.env, IQRAFI_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" } });
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, ".next/standalone"), out, { recursive: true });
fs.cpSync(path.join(root, ".next/static"), path.join(out, ".next/static"), { recursive: true });
fs.cpSync(path.join(root, "data/quran"), path.join(out, "data/quran"), { recursive: true });
fs.cpSync(path.join(root, "drizzle"), path.join(out, "drizzle"), { recursive: true });
// Never ship local secrets: configuration comes from the host's environment variables.
for (const f of fs.readdirSync(out)) if (f.startsWith(".env")) fs.rmSync(path.join(out, f));
for (const dir of ["@img", "@node-rs"]) {
  const p = path.join(out, "node_modules", dir);
  if (fs.existsSync(p)) for (const pkg of fs.readdirSync(p)) if (/win32|darwin/.test(pkg)) fs.rmSync(path.join(p, pkg), { recursive: true, force: true });
}
fs.copyFileSync(path.join(root, "docs/DEPLOY-CPANEL.md"), path.join(out, "DEPLOY-CPANEL.md"));

const zip = path.join(dist, "IQRAFI-server-linux-x64.zip");
fs.rmSync(zip, { force: true });
run(`zip -qr "${zip}" .`, { cwd: out });
console.log(`\n✓ Done: ${zip} (${(fs.statSync(zip).size / 1e6).toFixed(0)} MB)`);
