import 'dotenv/config'

export const seedData = async () => {
  console.log('[LUBRIX] Demo maʼlumotlar yuklanmaydi. Boʻsh tizim: foydalanuvchi oʻzi qoʻshadi.')
}

if (process.argv[1]?.endsWith('seedData.js')) {
  console.log('[LUBRIX] Seed o‘chirilgan: tizimga tayyor demo yozuvlar kiritilmaydi.')
  process.exit(0)
}
