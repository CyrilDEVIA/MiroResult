// api/src/index.ts
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({
  path: path.resolve(__dirname, process.env.NODE_ENV === 'production' ? '../.env' : '../.env.local')
})

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 9904

app.use(cors())
app.use(express.json())

// Routes
// import authRoutes from './routes/auth'
// app.use('/api/auth', authRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur http://localhost:${PORT}`)
})

export default app
