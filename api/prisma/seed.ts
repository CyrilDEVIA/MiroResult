import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@miroresult.com'
  const password = 'Admin1234!'

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log('Admin déjà existant, seed ignoré.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: { email, passwordHash, role: 'admin' },
  })

  console.log(`Admin créé : ${email} / ${password}`)
  console.log('⚠️  Changer le mot de passe en production !')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
