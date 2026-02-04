import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from 'vite-plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        presets: [
          "@babel/preset-env",
          ["@babel/preset-react", { "modules": false }]
        ],
        plugins: [
          [
            "../../../../dist/index.js",
            { sourceDir: "src" }
          ]
        ]
      }
    })
  ],
})
