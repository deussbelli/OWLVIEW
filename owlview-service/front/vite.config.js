import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

// function cspHeadersPlugin() {
//   return {
//     name: 'csp-headers',
//     configureServer(server) {
//       server.middlewares.use((req, res, next) => {
//         res.setHeader("Content-Security-Policy",
//           "default-src 'self'; " +
//           "script-src 'self' 'unsafe-inline'; " +
//           "style-src 'self' 'unsafe-inline'; " +
//           "img-src 'self' data: blob:; " +
//           "connect-src 'self' http://127.0.0.1:5000 http://localhost:5000 https://www.googleapis.com; " +
//           "font-src 'self' https:; " +
//           "frame-src 'none';"
//         );
//         next();
//       });
//     }
//   }
// }


export default defineConfig({
  plugins: [react(),],
  server: {
  proxy: {
    "/api": {
      target: "http://127.0.0.1:5000",
      changeOrigin: true,
      secure: false
    },
  },
  headers: {
    // 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // 'Cross-Origin-Embedder-Policy': 'require-corp'
  },
}
});

