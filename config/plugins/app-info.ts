import boxen from 'boxen'
import picocolors from 'picocolors'
import type { Plugin } from 'vite'

export default function appInfo(): Plugin {
  return {
    name: 'appInfo',
    apply: 'serve',
    async buildStart() {
      const { bold, green, cyan, bgGreen, underline } = picocolors
      // eslint-disable-next-line no-console
      console.log(
        boxen(
          `${bold(green(`${bgGreen('Sakura Admin v1.0.0-SNAPSHOT')}`))}\n${cyan('在线文档：')}${underline('https://sakura.hk.cn')}\n${cyan('常见问题：')}${underline('https://sakura.hk.cn/src/zh/3.其它/1.常见问题')}\n${cyan('持续迭代优化的一站式开放自动化平台')}`,
          {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            textAlignment: 'center',
          },
        ),
      )
    },
  }
}
