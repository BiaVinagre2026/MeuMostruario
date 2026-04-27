import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";

function resolveVersion(): string {
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION;
  try {
    return execSync("git describe --tags --always 2>/dev/null", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

function resolveGitSha(): string {
  if (process.env.VITE_GIT_SHA) return process.env.VITE_GIT_SHA;
  try {
    return execSync("git rev-parse --short HEAD 2>/dev/null", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export default defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(resolveVersion()),
    "import.meta.env.VITE_GIT_SHA": JSON.stringify(resolveGitSha()),
  },
  server: {
    allowedHosts: ["localhost", ".app.local"],
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": { target: "http://localhost:3002" },
      "/uploads": { target: "http://localhost:3002" },
      "/letter_opener": { target: "http://localhost:3002" },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
