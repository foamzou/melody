import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import importToCDN from 'vite-plugin-cdn-import'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({command, mode}) => {
  return {
    server: {
      host: '0.0.0.0'
    },
    base: './',
    define: {
      'process.env': process.env
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Melody',
          short_name: 'Melody',
          description: 'Enjoy your music with Melody',
          theme_color: '#ffffff',
          start_url:"./mobile.html",
          icons: [
            {
              src: 'melody-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'melody-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      vue(),
      importToCDN({
        modules:[
          {
              name: "vue",
              var: "Vue",
              path: "https://cdnjs.cloudflare.com/ajax/libs/vue/3.2.33/vue.global.min.js",
          },
          {
              name: "vue-router",
              var: "VueRouter",
              path: "https://cdnjs.cloudflare.com/ajax/libs/vue-router/4.0.14/vue-router.global.min.js",
          },
          {
              name: "vuex",
              var: "Vuex",
              path: 'https://cdnjs.cloudflare.com/ajax/libs/vuex/4.0.2/vuex.global.min.js',
          },
          {
              name: "axios",
              var: "axios",
              path: 'https://cdnjs.cloudflare.com/ajax/libs/axios/0.26.1/axios.min.js',
          },
          {
              name: "element-plus",
              var: "ElementPlus",
              path: 'https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.1.9/index.full.js',
              css: ["https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.1.9/theme-chalk/index.min.css"],
          },
          {
              name: "element-plus/lib/locale/lang/zh-cn",
              var: "ElementPlusLocaleZhCn",
              path: 'https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.1.9/locale/zh-cn.min.js',
          },
          {
            name: "vant",
            var: "vant",
            path: 'https://cdnjs.cloudflare.com/ajax/libs/vant/3.4.8/vant.js',
            css: ["https://cdnjs.cloudflare.com/ajax/libs/vant/3.4.8/index.min.csss"],
        }
        ]
      }),
    ],
    build: {
      rollupOptions: {
          input: {
              index: path.resolve(__dirname, 'index.html'),
              mobile: path.resolve(__dirname, 'mobile.html'),
          }, output: {
              chunkFileNames: 'static/js/[name]-[hash].js',
              entryFileNames: "static/js/[name]-[hash].js",
              assetFileNames: "static/[ext]/name-[hash].[ext]"
          }
      },
    }
  }
})
