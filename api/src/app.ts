import express from 'express'
import cors from 'cors'
import { errorMiddleware } from './middleware/error.middleware'
import authRoutes from './routes/auth.routes'
import simulationsRoutes from './routes/simulations.routes'
import reportsRoutes from './routes/reports.routes'
import recommendationsRoutes from './routes/recommendations.routes'
import statsRoutes from './routes/stats.routes'
import analysisRoutes from './routes/analysis.routes'
import settingsRoutes from './routes/settings.routes'
import htmlReportRoutes from './routes/html-report.routes'

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:9903',
  credentials: true,
}))

// Headers sécurité
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/simulations', simulationsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/recommendations', recommendationsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/html-report', htmlReportRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler (doit être en dernier)
app.use(errorMiddleware)

export default app
