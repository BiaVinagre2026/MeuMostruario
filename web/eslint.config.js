import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // _extracted/ sao bundles de referencia que nao entram no build e nenhum
  // arquivo do projeto importa.
  { ignores: ["dist", "coverage", "node_modules", "_extracted"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // O projeto usa _ para descartar valores em desestruturacao e catch.
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  {
    // Configs do Tailwind carregam plugins com require(), que e o formato que
    // a propria ferramenta espera.
    files: ["tailwind.config.ts", "postcss.config.js", "*.config.{js,ts}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Testes usam os globais do Vitest sem import explicito.
    files: ["**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
  },
);
