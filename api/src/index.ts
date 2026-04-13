import path from 'path'
import { access, writeFile } from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config({
  path: path.resolve(__dirname, process.env.NODE_ENV === 'production' ? '../.env' : '../.env.local'),
})
import app from './app'

const PORT = process.env.PORT ?? 9904

async function ensureProvidersFile(): Promise<void> {
  const filePath = path.resolve(__dirname, '../providers.json')
  try {
    await access(filePath)
  } catch {
    await writeFile(
      filePath,
      JSON.stringify({ active: null, providers: [] }, null, 2) + '\n',
      'utf8'
    )
  }
}

ensureProvidersFile().then(() => {
  app.listen(PORT, () => {
    console.log(`API démarrée sur http://localhost:${PORT}`)
  })
})
