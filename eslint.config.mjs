import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Generated declarations, engine bindings and build outputs.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "target/**",
    "src/game/generated.ts",
    "src/generated/engine/**",
    "public/engine/**",
  ]),
]);

export default eslintConfig;
