import { createApp } from 'vue'
import ArcoVue, { Card, Drawer, Modal } from '@arco-design/web-vue'
import '@/styles/arco-ui/index.less'
// import '@arco-themes/vue-gi-demo/index.less'
// import '@arco-design/web-vue/dist/arco.css'

// 额外引入 Arco Design Icon图标库
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import App from './App.vue'
import router from './router'

// 使用动画库
import 'animate.css/animate.min.css'

// 自定义过渡动画
import '@/styles/css/transition.css'

// 导入全局scss主文件
import '@/styles/index.scss'

// 支持SVG
import 'virtual:svg-icons-register'

// 自定义指令
import directives from './directives'

// 状态管理
import pinia from '@/stores'

// 对特定组件进行默认配置
Card.props.bordered = false

// 确保config.js已加载
const loadConfig = async () => {
  if (window.config) {
    return Promise.resolve(window.config)
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = '/config.js'
    script.onload = () => {
      resolve(window.config || {})
    }
    script.onerror = () => {
      console.warn('无法加载配置文件，使用空配置')
      window.config = {}
      resolve(window.config)
    }
    document.head.appendChild(script)
  })
}

// 初始化应用
async function bootstrap() {
  // 加载配置
  await loadConfig()

  const app = createApp(App)
  Modal._context = app._context
  Drawer._context = app._context

  // 添加全局配置
  app.config.globalProperties.$config = window.config

  app.use(router)
  app.use(pinia)
  app.use(ArcoVue)
  app.use(ArcoVueIcon)
  app.use(directives)

  app.mount('#app')
}

bootstrap()
