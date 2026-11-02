import { LockKeyhole, ShieldCheck } from 'lucide-react'

const sections = [
  {
    title: '1. Siyosat doirasi',
    body: 'Ushbu siyosat Lubrix avtoservis boshqaruv tizimida operatorlar, xodimlar va mijozlarga tegishli shaxsiy ma’lumotlarni qanday qayta ishlashini tushuntiradi. Tashkilot ma’muri o‘z mijozlariga ma’lumot yig‘ish va foydalanish haqida alohida xabar berishi kerak.',
  },
  {
    title: '2. Qayta ishlanadigan ma’lumotlar',
    body: 'Hisob ma’lumotlari: ism, ish emaili, telefon, rol va tashkilot. Mijoz ma’lumotlari: ism, telefon, email, til, aloqa roziligi va ixtiyoriy profil rasmi. Avtomobil ma’lumotlari: davlat raqami, marka, model, yil, VIN, probeg va ixtiyoriy rasm. Xizmat yozuvlari: sana, ishlatilgan moy, viskozitet, miqdor, narx va keyingi xizmat sanasi. Tizim xavfsizligi uchun sessiya, amal vaqti, IP manzil va brauzer ma’lumoti qayd etilishi mumkin. To‘lov kartasining to‘liq raqami yoki CVV saqlanmasligi kerak.',
  },
  {
    title: '3. Maqsad va huquqiy asos',
    body: 'Ma’lumotlar xizmat ko‘rsatish, mijoz va avtomobil tarixini yuritish, to‘lovni hisobga olish, akkaunt xavfsizligi, texnik yordam va foydalanuvchi so‘ragan eslatmalar uchun ishlatiladi. Xizmatni bajarish uchun zarur ma’lumotlar shartnomani bajarish doirasida; reklama SMS’lari va ixtiyoriy lokatsiya esa alohida rozilik asosida qayta ishlanadi. Qonuniy talablar bo‘lsa, tegishli yozuvlar talab etilgan muddatda saqlanishi mumkin.',
  },
  {
    title: '4. SMS va boshqa xabarnomalar',
    body: 'Xizmat eslatmalari va reklama kampaniyalari bir xil rozilik deb hisoblanmaydi. Tashkilot mijoz roziligini aniq qayd etishi, rozilikni bekor qilishni qo‘llab-quvvatlashi va opt-out qilgan mijozga reklama yubormasligi kerak. Xabarlar Eskiz yoki tashkilot tanlagan boshqa provayder orqali yuborilishi mumkin; provayder xabarni yetkazish uchun telefon raqamini qayta ishlaydi.',
  },
  {
    title: '5. Lokatsiya va telefon raqami',
    body: 'Lubrix telefon raqamidan odamning real vaqt lokatsiyasini aniqlamaydi va telefon raqami orqali yashirin kuzatuv qilmaydi. Lokatsiya funksiyasi joriy etilganda, u faqat qurilma egasi brauzer ruxsatini berganida, aniq maqsad ko‘rsatilganida va ulashishni foydalanuvchi o‘zi boshlaganida ishlashi mumkin. Ulashishni istalgan vaqtda to‘xtatish va lokatsiya tarixini saqlamaslik imkoniyati bo‘lishi kerak.',
  },
  {
    title: '6. Ovoz, AI va tashqi xizmatlar',
    body: 'Brauzer nutqni matnga aylantirishni qo‘llab-quvvatlasa, mikrofon faqat foydalanuvchi uni bosib yoqqanida ishlatiladi; ruxsat rad etilsa matnli qidiruv mavjud bo‘lishi kerak. AI yordamga faqat aytilgan yoki yozilgan savol yuboriladi; CRM yozuvlari yuborilmaydi. Skanerda AI tahlili alohida o‘chirilgan bo‘ladi va faqat foydalanuvchi rozilik checkbox’ini yoqqanda tanlangan rasm AI provayderiga yuboriladi. Maxfiy mijoz ma’lumotlari AI xizmatiga zarur bo‘lmasa yuborilmaydi. AI kaliti faqat server muhitida saqlanadi, brauzerga uzatilmaydi. Tashqi provayderlarning o‘z maxfiylik siyosati ham amal qiladi.',
  },
  {
    title: '7. Ma’lumot almashish va xavfsizlik',
    body: 'Ma’lumotlar tashkilot doirasida rolga asoslangan ruxsat bilan ko‘rsatiladi. Hosting, SMS, to‘lov yoki AI provayderlariga faqat tegishli funksiyani bajarish uchun zarur minimum uzatilishi mumkin. Ma’lumotlar sotilmaydi. Trafik HTTPS orqali himoyalanishi, maxfiy kalitlar serverda saqlanishi, kirish nazorat qilinishi va muhim amallar audit qilinishi lozim. Audit yozuvlari xavfsizlik uchun o‘zgartirilmaydi; tegishli biznes yozuvlarini tuzatish vakolatli foydalanuvchi tomonidan asos bilan bajariladi.',
  },
  {
    title: '8. Saqlash va o‘chirish',
    body: 'Xizmat tarixi, to‘lov va hisob yozuvlari tashkilotning qonuniy va biznes ehtiyojlari uchun zarur muddat davomida saqlanadi. Foydalanuvchi yoki tashkilot ma’muri noto‘g‘ri kontakt ma’lumotlarini tuzatishi, marketing roziligini bekor qilishi yoki ma’lumotni o‘chirish/arxivlash so‘rovini berishi mumkin. Audit izi va moliyaviy hujjatlar qonuniy majburiyat yoki nizoni ko‘rib chiqish uchun cheklangan muddat saqlanishi mumkin.',
  },
  {
    title: '9. Foydalanuvchi huquqlari',
    body: 'Foydalanuvchi o‘z ma’lumotlari haqida ma’lumot so‘rashi, xatoni tuzatishi, ixtiyoriy rozilikni bekor qilishi va qonun doirasida o‘chirishni so‘rashi mumkin. Mijozlar o‘z servis tashkilotiga; tashkilot xodimlari esa tashkilot ma’muriga yoki Lubrix yordam xizmatiga murojaat qiladi. So‘rovni bajarishdan oldin murojaatchi shaxsi tekshiriladi.',
  },
]

export default function PrivacyPolicyTab() {
  return (
    <article className="max-w-4xl space-y-6">
      <header className="border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <LockKeyhole size={20} />
          </div>
          <div>
            <p className="text-xs text-text-muted">Lubrix · Maxfiylik va ma’lumotlar</p>
            <h2 className="text-xl font-semibold text-text-primary">Maxfiylik siyosati</h2>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-muted">Amal qilish sanasi: 2026-yil 2-noyabr</p>
      </header>
      <div className="flex items-start gap-3 border-l-2 border-primary py-1 pl-4 text-sm leading-6 text-text-muted">
        <ShieldCheck size={18} className="mt-1 shrink-0 text-primary" />
        <p>
          Bu siyosat mahsulot interfeysida qanday ma’lumotlar ishlatilishini tushuntiradi. Tashkilot
          o‘z mijozlari bilan munosabatlarida amaldagi qonunchilikka mos alohida xabarnoma va
          rozilik matnini taqdim etishi kerak.
        </p>
      </div>
      <div className="divide-y divide-border">
        {sections.map((section) => (
          <section key={section.title} className="py-4">
            <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
