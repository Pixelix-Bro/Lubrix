import {
  Customer,
  InAppNotification,
  MessageLog,
  ServiceRecord,
  SmsCampaign,
  SmsTemplate,
} from '../../models/index.js'
import { getSmsProvider, MockSmsAdapter } from './smsAdapter.js'

function fillTemplate(message, customer) {
  return String(message || '')
    .replaceAll('{customer_name}', customer.fullName || 'Mijoz')
    .replaceAll('{phone}', customer.phoneE164 || '')
}

async function recipientsForSegment(organizationId, segment) {
  const customers = await Customer.find({
    organizationId,
    optedOutAt: { $in: [null] },
    customerType: { $ne: 'WALK_IN' },
    phoneE164: { $exists: true, $ne: '' },
  })

  if (segment === 'NO_CONSENT') return customers.filter((customer) => !customer.smsConsentAt)

  const consentedCustomers = customers.filter(
    (customer) => customer.smsConsentAt && customer.smsConsentSource
  )
  if (segment === 'ALL') return consentedCustomers

  const now = new Date()
  const services = await ServiceRecord.find({ organizationId }).sort({ serviceDate: -1 })
  const lastByCustomer = new Map()
  for (const s of services) {
    if (s.customerId && !lastByCustomer.has(s.customerId)) {
      lastByCustomer.set(s.customerId, s)
    }
  }

  if (segment === 'DUE_SOON') {
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    return consentedCustomers.filter((c) => {
      const last = lastByCustomer.get(c._id.toString())
      if (!last?.nextDueDate) return false
      const due = new Date(last.nextDueDate)
      return due >= now && due <= in14
    })
  }

  if (segment === 'OVERDUE_90') {
    const ago90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    return consentedCustomers.filter((c) => {
      const last = lastByCustomer.get(c._id.toString())
      if (!last) return true
      return new Date(last.serviceDate) < ago90
    })
  }

  if (segment === 'VIP') {
    const counts = {}
    for (const s of services) {
      if (!s.customerId) continue
      counts[s.customerId] = (counts[s.customerId] || 0) + 1
    }
    return consentedCustomers.filter((c) => (counts[c._id.toString()] || 0) >= 3)
  }

  return consentedCustomers
}

export const CampaignController = {
  async listCampaigns(req, res, next) {
    try {
      const campaigns = await SmsCampaign.find({ organizationId: req.organizationId }).sort({
        createdAt: -1,
      })
      res.json({ success: true, data: campaigns })
    } catch (err) {
      next(err)
    }
  },

  async previewRecipients(req, res, next) {
    try {
      const segment = req.query.segment || 'ALL'
      const list = await recipientsForSegment(req.organizationId, segment)
      res.json({
        success: true,
        data: {
          count: list.length,
          sample: list.slice(0, 8).map((c) => ({
            id: c._id,
            fullName: c.fullName,
            phoneE164: c.phoneE164,
          })),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async launchCampaign(req, res, next) {
    try {
      const { name, segment = 'ALL', message, scheduledAt } = req.body
      if (!message || !String(message).trim()) {
        return res.status(400).json({ success: false, error: 'SMS matni kiritilishi shart' })
      }
      if (segment === 'NO_CONSENT') {
        return res
          .status(400)
          .json({ success: false, error: 'Rozilik bermagan mijozlarga SMS yuborib bo‘lmaydi.' })
      }

      const recipients = await recipientsForSegment(req.organizationId, segment)
      const campaign = await SmsCampaign.create({
        organizationId: req.organizationId,
        name: name || `Kampaniya ${new Date().toLocaleDateString('uz-UZ')}`,
        segment,
        message: message.trim(),
        status: scheduledAt ? 'SCHEDULED' : 'SENDING',
        scheduledAt: scheduledAt || null,
        recipientCount: recipients.length,
        createdBy: req.user?.name || req.userId,
      })

      if (scheduledAt) {
        return res.json({ success: true, data: campaign, message: 'Kampaniya navbatga qo‘yildi' })
      }

      const provider = getSmsProvider()
      const testMode = provider instanceof MockSmsAdapter
      let sent = 0
      let failed = 0
      for (const customer of recipients) {
        const body = fillTemplate(message, customer)
        const result = await provider.sendSms({
          to: customer.phoneE164,
          message: body,
          organizationId: req.organizationId,
        })
        await MessageLog.create({
          organizationId: req.organizationId,
          customerName: customer.fullName,
          phone: customer.phoneE164,
          channel: 'SMS',
          provider: process.env.SMS_PROVIDER || 'mock',
          providerMessageId: result.providerMessageId,
          status: testMode ? 'test' : result.success ? 'sent' : 'failed',
          cost: result.cost || 0,
          sentAt: new Date(),
        })
        if (result.success) sent += 1
        else failed += 1
      }

      campaign.status = testMode ? 'TESTED' : failed && !sent ? 'FAILED' : 'SENT'
      campaign.sentCount = sent
      campaign.failedCount = failed
      await campaign.save()

      res.json({ success: true, data: campaign, testMode })
    } catch (err) {
      next(err)
    }
  },

  async listTemplates(req, res, next) {
    try {
      const templates = await SmsTemplate.find({ organizationId: req.organizationId }).sort({
        createdAt: -1,
      })
      res.json({ success: true, data: templates })
    } catch (err) {
      next(err)
    }
  },

  async saveTemplate(req, res, next) {
    try {
      const { name, body, id } = req.body
      if (!name || !body) {
        return res.status(400).json({ success: false, error: 'Shablon nomi va matni shart' })
      }
      let doc
      if (id) {
        doc = await SmsTemplate.findOneAndUpdate(
          { _id: id, organizationId: req.organizationId },
          { $set: { name, body } },
          { new: true }
        )
      } else {
        doc = await SmsTemplate.create({
          organizationId: req.organizationId,
          name,
          body,
        })
      }
      res.json({ success: true, data: doc })
    } catch (err) {
      next(err)
    }
  },

  async deleteTemplate(req, res, next) {
    try {
      await SmsTemplate.deleteOne({ _id: req.params.id, organizationId: req.organizationId })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },

  async listInbox(req, res, next) {
    try {
      const notes = await InAppNotification.find({
        organizationId: req.organizationId,
        dismissedAt: { $exists: false },
      })
        .sort({ createdAt: -1 })
        .limit(50)
      res.json({ success: true, data: notes })
    } catch (err) {
      next(err)
    }
  },

  async markRead(req, res, next) {
    try {
      await InAppNotification.updateMany(
        { organizationId: req.organizationId, readAt: { $exists: false } },
        { $set: { readAt: new Date() } }
      )
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },

  async markInboxItemRead(req, res, next) {
    try {
      const notification = await InAppNotification.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId, dismissedAt: { $exists: false } },
        { $set: { readAt: new Date() } },
        { new: true }
      )
      if (!notification) return res.status(404).json({ success: false, error: 'Xabar topilmadi' })
      res.json({ success: true, data: notification })
    } catch (err) {
      next(err)
    }
  },

  async dismissInboxItem(req, res, next) {
    try {
      const notification = await InAppNotification.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId },
        { $set: { dismissedAt: new Date() } },
        { new: true }
      )
      if (!notification) return res.status(404).json({ success: false, error: 'Xabar topilmadi' })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
}
