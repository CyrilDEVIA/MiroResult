import multer from 'multer'
import path from 'path'
import { randomUUID } from 'crypto'
import { AppError } from '../types'

const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE ?? '104857600', 10) // 100 MB défaut

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve('./uploads')

const ALLOWED_MIMES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'text/csv',
]

const ALLOWED_EXTS = ['.zip', '.json', '.csv']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext}`)
  },
})

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_MIMES.includes(file.mimetype) && !ALLOWED_EXTS.includes(ext)) {
    return cb(new AppError('Format non supporté. Formats acceptés : .zip, .json', 400))
  }
  cb(null, true)
}

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
})
