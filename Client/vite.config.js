import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: '../Server/dist',
        emptyOutDir: true
    },
    server: {
        proxy: {
            '/api': {
                target: 'https://8nxhkc37-3000.inc1.devtunnels.ms/', // Replace with your API URL
                changeOrigin: true,
                secure: false,
            },
        },
        // https: {
        //     key: fs.readFileSync('../ssl/key.pem'),
        //     cert: fs.readFileSync('../ssl/cert.pem'),
        // },
        // host: "192.168.1.38"
    },
})
