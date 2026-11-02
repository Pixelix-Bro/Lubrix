export const validateAssistantQuestion = (value) => {
  if (typeof value !== 'string') return { error: 'Savol matn ko‘rinishida bo‘lishi kerak.' }
  const question = value.trim()
  if (question.length < 2) return { error: 'Savol kamida 2 ta belgidan iborat bo‘lsin.' }
  if (question.length > 1200) return { error: 'Savol 1200 belgidan oshmasligi kerak.' }
  return { question }
}

export const validatePlateImageData = (value) => {
  if (typeof value !== 'string') return { error: 'Rasm ma’lumoti topilmadi.' }
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) return { error: 'Faqat JPEG, PNG yoki WebP rasm qabul qilinadi.' }
  const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0
  const byteLength = Math.floor((match[2].length * 3) / 4) - padding
  if (byteLength > 1_500_000) return { error: 'Rasm hajmi 1.5 MB dan oshmasligi kerak.' }
  return { imageDataUrl: value }
}

export const AssistantController = {
  async ask(req, res, next) {
    const { question, error } = validateAssistantQuestion(req.body?.question)
    if (error) return res.status(400).json({ success: false, error })

    const apiKey = process.env.AI_API_KEY?.trim()
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'AI yordam sozlanmagan. Serverda AI_API_KEY qiymatini kiriting.',
      })
    }

    try {
      const baseUrl = (process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
      const endpoint = new URL(`${baseUrl}/chat/completions`)
      if (
        endpoint.protocol !== 'https:' &&
        !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))
      ) {
        return res
          .status(503)
          .json({ success: false, error: 'AI_API_URL xavfsiz HTTPS manzil bo‘lishi kerak.' })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            {
              role: 'system',
              content:
                'Siz Lubrix avtoservis CRM tizimining foydalanish bo‘yicha yordamchisisiz. O‘zbek tilida aniq, qisqa va amaliy javob bering; ruscha yoki inglizcha savolga shu tilda javob bering. Yo‘riqnoma: Dashboard kunlik ko‘rsatkich va eslatmalarni beradi; Mijozlar bo‘limida mijoz yaratish va rozilikni qayd etish mumkin; mijoz profilida avtomobil, xizmat, ko‘rik, to‘lov va eslatma tarixi ko‘rinadi; Avtomobillar bo‘limi raqam/VIN bo‘yicha qidiradi; Xizmatlar moy almashtirish yozuvi va keyingi muddatni saqlaydi; Kassa savdo va chekni rasmiylashtiradi; Ombor mahsulot va qoldiqni boshqaradi; Eslatmalar SMS yuborish holatini ko‘rsatadi; Skaner kamera yoki rasm orqali raqamni tekshiradi; Moy tanlash tavsiyasini tekshirish kerak; 15 nuqtali Ko‘rik tekshiruvni saqlaydi; Hisobotlar daromad va tranzaksiyalarni ko‘rsatadi; Tarix (OWNER/ADMIN) kun/oy/sana oralig‘idagi audit yozuvlarini filtrlaydi; Sozlamalarda profil, filial, SMS/Telegram, billing va maxfiylik siyosati bor. Real CRM yozuvlari, to‘lov holati, kameraga yoki lokatsiyaga kira olmaysiz; bularni uydirmang, foydalanuvchini tegishli bo‘limga yuboring. Telefon raqami orqali lokatsiya aniqlash mumkin emas. Parol, API kaliti, karta yoki boshqa maxfiy ma’lumot so‘ramang.',
            },
            { role: 'user', content: question },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        return res.status(502).json({
          success: false,
          error: 'AI xizmatidan javob olinmadi. AI sozlamalari yoki provayder holatini tekshiring.',
        })
      }

      const answer = payload?.choices?.[0]?.message?.content?.trim()
      if (!answer) {
        return res.status(502).json({ success: false, error: 'AI bo‘sh javob qaytardi.' })
      }
      return res.json({ success: true, data: { answer } })
    } catch (requestError) {
      return next(requestError)
    }
  },

  async analyzePlate(req, res, next) {
    const { imageDataUrl, error } = validatePlateImageData(req.body?.imageDataUrl)
    if (error) return res.status(400).json({ success: false, error })

    const apiKey = process.env.AI_API_KEY?.trim()
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'AI yordam sozlanmagan. Serverda AI_API_KEY qiymatini kiriting.',
      })
    }

    try {
      const baseUrl = (process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
      const endpoint = new URL(`${baseUrl}/chat/completions`)
      if (
        endpoint.protocol !== 'https:' &&
        !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))
      ) {
        return res
          .status(503)
          .json({ success: false, error: 'AI_API_URL xavfsiz HTTPS manzil bo‘lishi kerak.' })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 120,
          messages: [
            {
              role: 'system',
              content:
                'Rasmdagi O‘zbekiston avtomobil davlat raqamini o‘qing. Hech narsani taxmin qilmang. Faqat JSON qaytaring: {"plate":"01 A 777 AA yoki bo‘sh satr","confidence":0-100}. Raqam aniq ko‘rinmasa plate bo‘sh satr, confidence 0 bo‘lsin.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Rasmdan davlat raqamini aniqlang.' },
                { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        return res.status(502).json({ success: false, error: 'AI rasmni tahlil qila olmadi.' })
      }

      let result
      try {
        result = JSON.parse(payload?.choices?.[0]?.message?.content || '{}')
      } catch {
        return res.status(502).json({ success: false, error: 'AI natijasi o‘qilmadi.' })
      }
      const plate = typeof result.plate === 'string' ? result.plate.trim().slice(0, 20) : ''
      const confidence = Math.max(0, Math.min(100, Number(result.confidence) || 0))
      return res.json({ success: true, data: { plate, confidence } })
    } catch (requestError) {
      return next(requestError)
    }
  },
}
