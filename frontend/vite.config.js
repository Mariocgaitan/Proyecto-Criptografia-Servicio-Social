import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import fs from "fs"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "..");
  const env = loadEnv(mode, rootDir, "");
  const useHttps = env.VITE_USE_HTTPS === "true";
  const apiProxyTarget = env.API_PROXY_TARGET || "http://127.0.0.1:8000";

  // Certificados mkcert para HTTPS local
  const certDir = path.resolve(rootDir, "certs");
  const httpsConfig = useHttps && fs.existsSync(path.join(certDir, "localhost+3.pem"))
    ? {
        key: fs.readFileSync(path.join(certDir, "localhost+3-key.pem")),
        cert: fs.readFileSync(path.join(certDir, "localhost+3.pem")),
      }
    : undefined;

  return {
    plugins: [react()],
    envDir: rootDir,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      https: httpsConfig,
      allowedHosts: [".trycloudflare.com"],
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.js"],
      globals: true,
    },
  };
})
