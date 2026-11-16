import { createApp } from 'vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import '../styles/theme.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
document.documentElement.classList.add('mobile-admin')
app.use(Vant)
app.use(router)
app.mount('#app')
