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
              path: "https://cdn.staticfile.org/vue/3.2.33/vue.global.js",
          },
          {
              name: "vue-router",
              var: "VueRouter",
              path: "https://cdn.staticfile.org/vue-router/4.0.14/vue-router.global.js",
          },
          {
              name: "vuex",
              var: "Vuex",
              path: 'https://cdn.staticfile.org/vuex/4.0.2/vuex.global.js',
          },
          {
              name: "axios",
              var: "axios",
              path: 'https://cdn.staticfile.org/axios/0.26.1/axios.js',
          },
          {
              name: "element-plus",
              var: "ElementPlus",
              path: 'https://cdn.staticfile.org/element-plus/2.1.9/index.full.js',
              css: ["https://cdn.staticfile.org/element-plus/2.1.9/theme-chalk/index.css"],
          },
          {
              name: "element-plus/lib/locale/lang/zh-cn",
              var: "ElementPlusLocaleZhCn",
              path: 'https://cdn.staticfile.org/element-plus/2.1.9/locale/zh-cn.js',
          },
          {
            name: "vant",
            var: "vant",
            path: 'https://cdn.bootcdn.net/ajax/libs/vant/3.4.8/vant.js',
            css: ["https://cdn.bootcdn.net/ajax/libs/vant/3.4.8/index.css"],
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
