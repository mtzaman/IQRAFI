import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "data/**", "dist/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  // The Windows launcher runs as a Node.js single executable application, which requires CommonJS.
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
