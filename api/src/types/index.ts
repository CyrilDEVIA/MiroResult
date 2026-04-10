import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    role: string
  }
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}
