import { InAppNotification, Organization } from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'
import { TelegramService } from '../telegram/telegramService.js'

export async function checkSubscriptionAlerts() {
  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orgs = await Organization.find({
    subscriptionExpiresAt: { $gte: now, $lte: inSevenDays },
    subscriptionStatus: 'ACTIVE',
  })

  for (const org of orgs) {
    const organizationId = org._id.toString()
    const daysLeft = Math.max(
      0,
      Math.ceil((org.subscriptionExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    )
    const dedupeKey = `plan-expiry:${org.subscriptionExpiresAt.toISOString().slice(0, 10)}`
    try {
      const notification = await InAppNotification.create({
        organizationId,
        dedupeKey,
        type: 'PLAN_EXPIRY',
        title: 'Obuna tugashiga oz qoldi',
        body: `${org.subscriptionPlan || 'Tarif'} obunasi ${daysLeft} kundan so‘ng tugaydi. Xizmat to‘xtamasligi uchun yangilang.`,
        actionUrl: '/settings?tab=billing',
      })
      emitTenantEvent(organizationId, 'IN_APP_NOTIFICATION', notification)
      await TelegramService.notifyOwner(organizationId, 'planExpiry', { daysLeft })
    } catch (error) {
      if (error.code !== 11000) throw error
    }
  }
}
