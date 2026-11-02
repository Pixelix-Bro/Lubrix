export const DEFAULT_BOT_COMMANDS_VERSION = 3

export const DEFAULT_BOT_COMMANDS = [
  {
    command: '/start',
    title: 'Boshlash',
    description: 'Botni ochganda ko‘rsatiladigan xabar',
    isSystem: true,
    responseType: 'Inline Message',
    configuration: { action: 'menu.start' },
    responseTemplate: `Assalomu alaykum! {{org_name}} rasmiy xizmat botiga xush kelibsiz.

Asosiy menyudan kerakli xizmatni tanlang.`,
  },
  {
    command: '/help',
    title: 'Yordam',
    description: 'Mavjud bot komandalarini ko‘rsatadi',
    isSystem: true,
    responseType: 'Inline Message',
    configuration: { action: 'menu.help' },
    responseTemplate: 'Mavjud komandalar va xizmatlar:',
  },
  {
    command: '/search',
    title: 'Avtomobil qidirish',
    description: 'Avtomobil yoki telefon bo‘yicha qidiruvni boshlaydi',
    isSystem: true,
    responseType: 'Inline Message',
    configuration: { action: 'search.menu' },
    responseTemplate: 'Qidiruv turini tanlang.',
  },
  {
    command: '/branches',
    title: 'Filiallar',
    description: 'Faol filiallar ro‘yxati',
    isSystem: true,
    responseType: 'Inline Message',
    configuration: { action: 'branches.regions' },
    responseTemplate: `{{org_name}} filiallari:

{{branches}}`,
  },
  {
    command: '/products',
    title: 'Mahsulotlar',
    description: 'Katalogdagi mahsulotlar',
    isSystem: true,
    responseType: 'Text Message',
    configuration: { action: 'products.list' },
    responseTemplate: `Mahsulotlar:

{{products}}`,
  },
  {
    command: '/services',
    title: 'Xizmatlar',
    description: 'Biznesda kiritilgan xizmat ma’lumotlarini ko‘rsatadi',
    isSystem: true,
    responseType: 'Text Message',
    configuration: { action: 'services.list' },
    responseTemplate: 'Xizmatlar',
  },
  {
    command: '/mycars',
    title: 'Mening avtomobillarim',
    description: 'Tasdiqlangan telefon kontakti bo‘yicha avtomobillarni ko‘rsatadi',
    isSystem: true,
    responseType: 'Reply Message',
    configuration: { action: 'customer.cars' },
    responseTemplate: 'Mijoz telefonini tasdiqlash uchun kontakt yuboring.',
  },
  {
    command: '/history',
    title: 'Xizmatlar tarixi',
    description: 'Faqat tasdiqlangan mijozning o‘z xizmat tarixini ko‘rsatadi',
    isSystem: true,
    responseType: 'Reply Message',
    configuration: { action: 'customer.history' },
    responseTemplate:
      'Xizmatlar tarixini ko‘rish uchun telefon raqamingiz tasdiqlangan bo‘lishi kerak.',
  },
  {
    command: '/contact',
    title: 'Aloqa',
    description: 'Telefon va manzil',
    isSystem: true,
    responseType: 'Text Message',
    configuration: { action: 'contact' },
    responseTemplate: `{{org_name}}
Tel: {{org_phone}}
Manzil: {{org_address}}`,
  },
  {
    command: '/booking',
    title: 'Tashrif so‘rovi',
    description: 'Filial tasdig‘i uchun tashrif so‘rovi qoldiradi',
    isSystem: true,
    responseType: 'Inline Message',
    configuration: { action: 'booking.start' },
    responseTemplate: 'Tashrif so‘rovini boshlash',
  },
  {
    command: '/cancel',
    title: 'Bekor qilish',
    description: 'Joriy qidiruv yoki bot jarayonini bekor qiladi',
    isSystem: true,
    responseType: 'Text Message',
    configuration: { action: 'flow.cancel' },
    responseTemplate: 'Joriy jarayon bekor qilindi.',
  },
]
