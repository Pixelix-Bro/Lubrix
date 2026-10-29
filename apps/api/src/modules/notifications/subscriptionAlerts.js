import { InAppNotification, Organization } from '../../models/index.js'
import { TelegramService } from '../telegram/telegramService.js'

export async function checkSubscriptionAlerts() {
  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orgs = await Organization.find({
    subscriptionExpiresAt: { $gte: now, $lte: inSevenDays },
    subscriptionStatus: 'ACTIVE',
  })

  for (const org of orgs) {
    const daysLeft = Math.max(
      0,
      Math.ceil((org.subscriptionExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    )
    const exists = await InAppNotification.findOne({
      organizationId: org._id.toString(),
      type: 'PLAN_EXPIRY',
      createdAt: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
    })
    if (exists) continue

    await InAppNotification.create({
      organizationId: org._id.toString(),
      type: 'PLAN_EXPIRY',
      title: 'Obuna tugashiga oz qoldi',
      body: `${org.subscriptionPlan || 'Tarif'} obunasi ${daysLeft} kundan so‘ng tugaydi. Xizmat to‘xtamasligi uchun yangilang.`,
    })
    await TelegramService.notifyOwner(org._id.toString(), 'planExpiry', { daysLeft })
  }
}
