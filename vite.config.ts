import { URL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { defineConfig, loadEnv } from 'vite'
import createVitePlugins from './config/plugins'

function loadCertificateTarget() {
  const configPath = fileURLToPath(new URL('./public/config.js', import.meta.url))
  const source = readFileSync(configPath, 'utf8')
  const sandbox: { window: Record<string, any> } = { window: {} }

  runInNewContext(source, sandbox, { filename: configPath })

  const target = sandbox.window.config?.environment?.url
  if (typeof target !== 'string' || !target.trim())
    throw new Error(`public/config.js 中未找到有效的 environment.url: ${configPath}`)

  return target
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd()) as ImportMetaEnv
  const certificateTarget = loadCertificateTarget()

  return {
    // 开发或生产环境服务的公共基础路径
    base: env.VITE_BASE,
    // 路径别名
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // 引入sass全局样式变量
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/var.scss" as *;`,
          api: 'modern-compiler',
        },
      },
    },
    // 添加需要vite优化的依赖
    optimizeDeps: {
      include: ['vue-draggable-plus'],
    },
    server: {
      // 开发端口由 .env.development 的 VITE_DEV_PORT 指定；未设 strictPort，占用时 Vite 自动换端口
      port: Number.parseInt(env.VITE_DEV_PORT || '5173', 10),
      // 是否严格检查端口是否被占用，默认false，占用时Vite 自动换端口
      strictPort: false,
      // 后端 Debug 启动会先等待调试器，自动开页会在 8000 端口监听前触发初始化请求。
      // 关闭自动开页，待前后端都启动完成后再手动访问开发地址。
      open: false,
      // 本地跨域代理 -> 代理到服务器的接口地址
      proxy: {
        [env.VITE_API_PREFIX]: {
          target: env.VITE_API_BASE_URL, // 后台服务器地址
          changeOrigin: true, // 是否允许不同源
          secure: false, // 支持https
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_API_PREFIX}`), ''),
        },
        '/api/gitee': {
          target: 'https://gitee.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gitee/, ''),
        },
        // 证书系统代理配置
        '/api/certificate': {
          target: certificateTarget, // 从 public/config.js 的 environment.url 读取
          changeOrigin: true, // 允许跨域
          secure: false, // 支持https（如果证书无效可设为false）
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              // The browser request is same-origin after proxying; do not forward its CORS origin.
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
          rewrite: (path) => path.replace(/^\/api\/certificate/, ''), // 去掉 /api/certificate 前缀
        },
      },
    },
    plugins: createVitePlugins(env, command === 'build'),
    // 构建
    build: {
      chunkSizeWarningLimit: 2000, // 消除打包大小超过500kb警告
      outDir: 'dist', // 指定打包路径，默认为项目根目录下的dist目录
      minify: 'terser', // Vite 2.6.x 以上需要配置 minify："terser"，terserOptions才能生效
      terserOptions: {
        compress: {
          keep_infinity: true, // 防止 Infinity 被压缩成 1/0，这可能会导致 Chrome 上的性能问题
          drop_console: true, // 生产环境去除 console
          drop_debugger: true, // 生产环境去除 debugger
        },
        format: {
          comments: false, // 删除注释
        },
      },
      // 静态资源打包到dist下的不同目录
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
        },
      },
    },
    // 以 envPrefix 开头的环境变量会通过 import.meta.env 暴露在你的客户端源码中。
    envPrefix: ['VITE', 'FILE'],
  }
})
