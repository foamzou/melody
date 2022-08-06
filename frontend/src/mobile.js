import vant from 'vant';
import 'vant/lib/index.css';
import VueVirtualScroller from 'vue-virtual-scroller'
import { createApp } from 'vue'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useRegisterSW } from 'virtual:pwa-register/vue';

import App from './Mobile.vue'
import router from './router/mobile'

useRegisterSW();

const app = createApp(App)
app.use(router)
app.use(vant)
app.use(VueVirtualScroller)
app.mount('#app')

