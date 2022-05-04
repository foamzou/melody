import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import ElementPlusLocaleZhCn from 'element-plus/lib/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn })
app.mount('#app')

