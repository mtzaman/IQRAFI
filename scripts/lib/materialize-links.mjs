import fs from "node:fs";
import path from "node:path";

/**
 * Replaces every symbolic link under `dir` with a real copy of its target.
 * Next.js links external server packages (pg, pglite, argon2) from `.next/node_modules`;
 * zip files and Windows drop those links, so packaged apps must contain real files.
 */
export function materializeSymlinks(dir) {
  let replaced = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        const target = fs.realpathSync(full);
        fs.rmSync(full, { force: true });
        fs.cpSync(target, full, { recursive: true, dereference: true });
        replaced++;
        if (fs.statSync(full).isDirectory()) walk(full);
      } else if (entry.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(dir);
  return replaced;
}
