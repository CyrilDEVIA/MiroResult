import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { AppError } from '../types'

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new AppError('Email ou mot de passe incorrect', 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)

  if (!valid) {
    throw new AppError('Email ou mot de passe incorrect', 401)
  }

  const secret = process.env.JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '24h'

  if (!secret) {
    throw new AppError('Configuration JWT manquante', 500)
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn } as jwt.SignOptions
  )

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
  }
}
