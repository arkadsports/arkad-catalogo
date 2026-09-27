import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const R2 = 'https://pub-5d730db9d93247579dd905474ae50aba.r2.dev'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/..." aponta para src/ — é o caminho que os componentes shadcn/ui usam.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // /foto/... repassa as fotos do R2 pelo mesmo endereço do site, para a
  // imagem do pedido poder desenhá-las (o R2 não libera CORS). Na Vercel, o
  // mesmo repasse está no vercel.json.
  server: { proxy: { '/foto': { target: R2, changeOrigin: true, rewrite: (p) => p.replace(/^\/foto/, '') } } },
  preview: { proxy: { '/foto': { target: R2, changeOrigin: true, rewrite: (p) => p.replace(/^\/foto/, '') } } },
})
