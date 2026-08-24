import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { networkInterfaces, type NetworkInterfaceInfo } from "os";

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

/**
 * IPs desta maquina na rede local, para o celular abrir o app pelo endereco de
 * rede. Descobertos no boot em vez de fixados: o IP muda quando o roteador
 * renova o DHCP ou quando se troca de rede.
 */
function localNetworkHosts(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface): iface is NetworkInterfaceInfo => Boolean(iface) && !iface!.internal)
    .map((iface) => iface.address);
}

const LOCAL_NETWORK_HOSTS = localNetworkHosts();

export default defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(resolveVersion()),
    "import.meta.env.VITE_GIT_SHA": JSON.stringify(resolveGitSha()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
        },
      },
    },
  },
  server: {
    // IPs da rede local entram na lista para o acesso pelo celular nao depender
    // do comportamento padrao do Vite com endereco numerico, que ja mudou entre
    // versoes. `.app.local` cobre os subdominios por tenant em desenvolvimento.
    allowedHosts: ["localhost", ".app.local", ...LOCAL_NETWORK_HOSTS],
    // true escuta em IPv4 e IPv6. O "::" anterior dependia de dual-stack do
    // sistema para responder no IPv4 da rede.
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000" },
      "/uploads": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000" },
      "/letter_opener": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000" },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
