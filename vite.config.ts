import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// O front-end conversa com a API Spring (MedVoll) através de um proxy em /api.
// Isso evita problemas de CORS sem exigir qualquer alteração na API.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    // O chunk do shader (three.js) é carregado sob demanda apenas na tela inicial.
    build: { chunkSizeWarningLimit: 1200 },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            // Quando a API está offline, responde 503 com um cabeçalho próprio,
            // permitindo que o front-end ative o modo local automaticamente.
            proxy.on('error', (_err, _req, res) => {
              const r = res as import('http').ServerResponse
              if (!r.headersSent) {
                r.writeHead(503, { 'Content-Type': 'application/json', 'X-Medvoll-Proxy': 'offline' })
              }
              r.end(JSON.stringify({ erro: 'API indisponível' }))
            })
          },
        },
      },
    },
  }
})
