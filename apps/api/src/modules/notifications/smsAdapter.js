/**
 * Lubrix SMS Adapter Interface
 * Istalgan SMS provayder (Eskiz, PlayMobile, Twilio, Mock) uchun yagona interfeys
 */

export class SmsAdapter {
  async sendSms() {
    throw new Error('sendSms method must be implemented')
  }
}

export class MockSmsAdapter extends SmsAdapter {
  async sendSms({ to, message, organizationId }) {
    const mockId = `mock_sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    console.log(`[LUBRIX SMS MOCK] To: ${to} | Msg: "${message}" | Tenant: ${organizationId}`)
    return {
      success: true,
      providerMessageId: mockId,
      status: 'sent',
      cost: 0.005,
    }
  }
}

export class EskizSmsAdapter extends SmsAdapter {
  constructor(email, password, from = '4546') {
    super()
    this.email = email
    this.password = password
    this.from = from
    this.token = null
  }

  async authenticate() {
    if (this.token) return this.token
    try {
      const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      })
      const data = await res.json()
      if (data?.data?.token) {
        this.token = data.data.token
        return this.token
      }
    } catch (e) {
      console.error('[Eskiz Auth Error]:', e)
    }
    return null
  }

  async sendSms({ to, message }) {
    const token = await this.authenticate()
    if (!token) {
      return { success: false, error: 'Eskiz auth failed', status: 'failed' }
    }

    try {
      const cleanPhone = to.replace('+', '')
      const formData = new FormData()
      formData.append('mobile_phone', cleanPhone)
      formData.append('message', message)
      formData.append('from', this.from)

      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      return {
        success: data?.status === 'waiting' || data?.status === 'success',
        providerMessageId: data?.id ? String(data.id) : null,
        status: 'sent',
        cost: 0.008,
      }
    } catch (err) {
      return { success: false, error: err.message, status: 'failed' }
    }
  }
}

export const getSmsProvider = () => {
  const provider = process.env.SMS_PROVIDER || 'mock'
  if (provider === 'eskiz' && process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD) {
    return new EskizSmsAdapter(
      process.env.ESKIZ_EMAIL,
      process.env.ESKIZ_PASSWORD,
      process.env.ESKIZ_SENDER_NAME
    )
  }
  return new MockSmsAdapter()
}
