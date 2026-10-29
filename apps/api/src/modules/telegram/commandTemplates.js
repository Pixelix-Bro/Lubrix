export const DEFAULT_BOT_COMMANDS = [
  {
    command: '/start',
    title: 'Boshlash',
    description: 'Botni ochganda ko‘rsatiladigan xabar',
    isSystem: true,
    responseTemplate: `Assalomu alaykum! {{org_name}} rasmiy xizmat botiga xush kelibsiz.

Buyruqlar:
/branches — filiallar
/products — mahsulotlar
/contact — aloqa`,
  },
  {
    command: '/branches',
    title: 'Filiallar',
    description: 'Faol filiallar ro‘yxati',
    isSystem: true,
    responseTemplate: `{{org_name}} filiallari:

{{branches}}`,
  },
  {
    command: '/products',
    title: 'Mahsulotlar',
    description: 'Katalogdagi mahsulotlar',
    isSystem: true,
    responseTemplate: `Mahsulotlar:

{{products}}`,
  },
  {
    command: '/contact',
    title: 'Aloqa',
    description: 'Telefon va manzil',
    isSystem: true,
    responseTemplate: `{{org_name}}
Tel: {{org_phone}}
Manzil: {{org_address}}`,
  },
]
