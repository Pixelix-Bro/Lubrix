/**
 * Lubrix Reminder Engine - Calculation & Idempotency Rules
 * Sana va kilometr qoidalarini markaziy hisoblaydi.
 */

export const calculateNextService = ({
  serviceDate = new Date(),
  odometerKm,
  intervalDays = 90, // Standart 3 oy (90 kun)
  intervalKm = 7000, // Standart 7,000 km
}) => {
  const dateObj = new Date(serviceDate);
  const nextDueDate = new Date(dateObj.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const nextDueKm = odometerKm ? Number(odometerKm) + Number(intervalKm) : null;

  return {
    nextDueDate,
    nextDueKm,
  };
};

/**
 * 14 kun, 3 kun oldin va muddat kuniga eslatma sanalarini hisoblaydi
 */
export const calculateReminderSchedules = (nextDueDate) => {
  if (!nextDueDate) return [];
  const targetTime = new Date(nextDueDate).getTime();

  const schedules = [
    {
      eventType: 'REMINDER_14_DAYS',
      daysBefore: 14,
      dueAt: new Date(targetTime - 14 * 24 * 60 * 60 * 1000),
    },
    {
      eventType: 'REMINDER_3_DAYS',
      daysBefore: 3,
      dueAt: new Date(targetTime - 3 * 24 * 60 * 60 * 1000),
    },
    {
      eventType: 'REMINDER_DUE_DAY',
      daysBefore: 0,
      dueAt: new Date(targetTime),
    },
  ];

  // Faqat kelajakdagi yoki bugungi vaqtdagi eslatmalarni rejalashtirish
  const now = Date.now();
  return schedules.filter((s) => s.dueAt.getTime() > now);
};

/**
 * Idempotency kalitini yaratish (dublikat xabar yuborilmasligi uchun)
 */
export const generateReminderKey = ({ organizationId, serviceRecordId, vehicleId, eventType }) => {
  return `lubrix:reminder:${organizationId}:${serviceRecordId || vehicleId}:${eventType}`;
};

/**
 * Telefon raqamini E.164 formatiga normallashtirish (+998901234567)
 */
export const normalizePhoneE164 = (phone, defaultCountry = 'UZ') => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('8') && cleaned.length === 11 && defaultCountry === 'RU') {
    cleaned = '+7' + cleaned.slice(1);
  } else if (cleaned.startsWith('998') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length === 9) {
    // 90 123 45 67 -> +998901234567
    cleaned = '+998' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
};
