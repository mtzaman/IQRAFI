/**
 * Builds the self-contained Windows demo package:
 *
 *   dist/IQRAFI-Demo/IQRAFI.exe      launcher (Node.js single executable application)
 *   dist/IQRAFI-Demo/app/            Next.js standalone server + verified Qur'an data + migrations
 *   dist/IQRAFI-Demo-win-x64.zip
 *
 * Runs on Windows, macOS or Linux (cross-builds the Windows package). Usage:
 *   npm run desktop:build            (add --skip-build to reuse an existing standalone build)
 */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dist = path.join(root, "dist");
const out = path.join(dist, "IQRAFI-Demo");
const app = path.join(out, "app");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "iqrafi-desktop-"));
const nodeVersion = process.versions.node;
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
const log = (m) => console.log(`\n▸ ${m}`);

if (!process.argv.includes("--skip-build")) {
  log("Building the standalone server");
  run("npx next build", { env: { ...process.env, IQRAFI_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" } });
}

log("Assembling the package");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, ".next/standalone"), app, { recursive: true });
fs.cpSync(path.join(root, ".next/static"), path.join(app, ".next/static"), { recursive: true });
fs.cpSync(path.join(root, "data/quran"), path.join(app, "data/quran"), { recursive: true });
fs.cpSync(path.join(root, "drizzle"), path.join(app, "drizzle"), { recursive: true });
// Never ship local secrets: the launcher provides all configuration.
for (const f of fs.readdirSync(app)) if (f.startsWith(".env")) fs.rmSync(path.join(app, f));
// Drop Linux/macOS-only native binaries (image optimisation is unused; argon2 is replaced below).
for (const dir of ["@img", "@node-rs"]) {
  const p = path.join(app, "node_modules", dir);
  if (!fs.existsSync(p)) continue;
  for (const pkg of fs.readdirSync(p)) if (/linux|darwin|musl/.test(pkg)) fs.rmSync(path.join(p, pkg), { recursive: true, force: true });
}

log("Adding the Windows password-hashing binary");
const argonVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules/@node-rs/argon2/package.json"), "utf8")).version;
const tgz = execFileSync("npm", ["pack", `@node-rs/argon2-win32-x64-msvc@${argonVersion}`, "--silent"], { cwd: tmp, shell: process.platform === "win32" }).toString().trim().split("\n").pop();
const argonDir = path.join(app, "node_modules/@node-rs/argon2-win32-x64-msvc");
fs.mkdirSync(argonDir, { recursive: true });
run(`tar -xzf "${path.join(tmp, tgz)}" -C "${argonDir}" --strip-components=1`);

log(`Preparing Node.js ${nodeVersion} for Windows`);
const nodeExe = path.join(tmp, "node.exe");
if (process.platform === "win32") {
  fs.copyFileSync(process.execPath, nodeExe);
} else {
  const base = `https://nodejs.org/dist/v${nodeVersion}`;
  const zipName = `node-v${nodeVersion}-win-x64.zip`;
  const zipPath = path.join(tmp, zipName);
  const fetchTo = async (url, file) => fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
  await fetchTo(`${base}/${zipName}`, zipPath);
  const sums = await (await fetch(`${base}/SHASUMS256.txt`)).text();
  const expected = sums.split("\n").find((l) => l.endsWith(`  ${zipName}`))?.split(" ")[0];
  const actual = createHash("sha256").update(fs.readFileSync(zipPath)).digest("hex");
  if (!expected || expected !== actual) throw new Error("Node.js download failed checksum verification");
  run(`unzip -q -j "${zipPath}" "node-v${nodeVersion}-win-x64/node.exe" -d "${tmp}"`);
}

log("Creating IQRAFI.exe");
const seaConfig = path.join(tmp, "sea-config.json");
const blob = path.join(tmp, "sea-prep.blob");
fs.writeFileSync(seaConfig, JSON.stringify({ main: path.join(root, "scripts/desktop/launcher.cjs"), output: blob, disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false }));
run(`"${process.execPath}" --experimental-sea-config "${seaConfig}"`);
const exe = path.join(out, "IQRAFI.exe");
fs.copyFileSync(nodeExe, exe);
removeAuthenticodeSignature(exe);
run(`npx postject "${exe}" NODE_SEA_BLOB "${blob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`);

fs.copyFileSync(path.join(root, "scripts/desktop/README-TESTERS.txt"), path.join(out, "README-TESTERS.txt"));
// Fallback for when the browser does not open automatically (double-click opens the default browser).
fs.writeFileSync(path.join(out, "Open IQRAFI in browser.url"), "[InternetShortcut]\r\nURL=http://127.0.0.1:3000/\r\n");

log("Zipping");
const zip = path.join(dist, "IQRAFI-Demo-win-x64.zip");
fs.rmSync(zip, { force: true });
if (process.platform === "win32") run(`powershell -NoProfile -Command "Compress-Archive -Path '${out}' -DestinationPath '${zip}'"`);
else run(`zip -qr "${zip}" IQRAFI-Demo`, { cwd: dist });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n✓ Done: ${zip} (${(fs.statSync(zip).size / 1e6).toFixed(0)} MB)`);

/**
 * node.exe is signed by the Node.js project; injecting the app invalidates that signature.
 * A corrupted signature is treated worse than none, so remove it (PE security directory)
 * — equivalent to `signtool remove /s`. Sign the result with your own certificate for release.
 */
function removeAuthenticodeSignature(file) {
  const buf = fs.readFileSync(file);
  const pe = buf.readUInt32LE(0x3c);
  if (buf.toString("latin1", pe, pe + 4) !== "PE\0\0") throw new Error("Not a PE file");
  const opt = pe + 24;
  const magic = buf.readUInt16LE(opt);
  const dirs = opt + (magic === 0x20b ? 112 : 96);
  const entry = dirs + 4 * 8; // IMAGE_DIRECTORY_ENTRY_SECURITY
  const offset = buf.readUInt32LE(entry);
  const size = buf.readUInt32LE(entry + 4);
  if (!offset || !size) return;
  buf.writeUInt32LE(0, entry);
  buf.writeUInt32LE(0, entry + 4);
  fs.writeFileSync(file, offset + size >= buf.length ? buf.subarray(0, offset) : buf);
}
