import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const uiRoot = resolve(scriptDirectory, '..')
const zipPath = resolve(uiRoot, 'dist.zip')
const targetPath = resolve(uiRoot, '..', 'sakura-admin', 'docker', 'continew-admin', 'html')

const archiveBuffer = await readFile(zipPath).catch(() => {
  throw new Error(`Build artifact not found: ${zipPath}. Run pnpm build first.`)
})
const archive = await JSZip.loadAsync(archiveBuffer)

await mkdir(targetPath, { recursive: true })

for (const [entryName, entry] of Object.entries(archive.files)) {
  const normalizedEntryName = entryName.replaceAll('\\', '/')
  const destinationPath = resolve(targetPath, normalizedEntryName)
  const relativeDestination = relative(targetPath, destinationPath)

  if (!normalizedEntryName || normalizedEntryName.startsWith('/') || isAbsolute(relativeDestination) || relativeDestination.startsWith('..')) {
    throw new Error(`Unsafe archive entry: ${entryName}`)
  }

  if (entry.dir) {
    await mkdir(destinationPath, { recursive: true })
    continue
  }

  await mkdir(dirname(destinationPath), { recursive: true })
  await writeFile(destinationPath, await entry.async('nodebuffer'))
}

console.log(`Frontend artifacts extracted to: ${targetPath}`)
