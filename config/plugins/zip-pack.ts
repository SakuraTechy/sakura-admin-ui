import type { PluginOption } from 'vite'
import zipPack from 'vite-plugin-zip-pack'

export default function createZipPack(): PluginOption {
  return zipPack({
    inDir: 'dist', // 需要压缩的文件夹
    outDir: './', // 输出目录，相对于项目根目录
    outFileName: 'dist.zip', // 输出文件名
    // 排除某些文件
    // exclude: ["some-file.js"]
  })
}
