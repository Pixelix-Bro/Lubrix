/**
 * Lubrix SMS Adapter Interface
 * SMS provider integrations used by the API.
 */

export class SmsAdapter {
  async sendSms() {
    throw new Error('sendSms method must be implemented')
  }
}

export class SmsProviderConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SmsProviderConfigurationError'
    this.statusCode = 503
  }
}

export class EskizSmsAdapter extends SmsAdapter {
  constructor(email, password, from = '4546') {
    super()
    this.name = 'eskiz'
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
      const success = data?.status === 'waiting' || data?.status === 'success'
      return {
        success,
        providerMessageId: data?.id ? String(data.id) : null,
        status: success ? 'sent' : 'failed',
        error: success ? undefined : data?.message || 'Eskiz SMS delivery failed',
      }
    } catch (err) {
      return { success: false, error: err.message, status: 'failed' }
    }
  }
}

export const getSmsProvider = () => {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase()
  if (!provider) {
    throw new SmsProviderConfigurationError('SMS_PROVIDER is not configured')
  }

  if (provider === 'eskiz') {
    if (!process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD) {
      throw new SmsProviderConfigurationError('Eskiz credentials are not configured')
    }
    return new EskizSmsAdapter(
      process.env.ESKIZ_EMAIL,
      process.env.ESKIZ_PASSWORD,
      process.env.ESKIZ_SENDER_NAME
    )
  }

  throw new SmsProviderConfigurationError('Configured SMS provider is not supported')
}
