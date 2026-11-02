import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        // https: {
        //     key: fs.readFileSync('../ssl/key.pem'),
        //     cert: fs.readFileSync('../ssl/cert.pem'),
        // },
        // host: "192.168.1.38"
    },
})
