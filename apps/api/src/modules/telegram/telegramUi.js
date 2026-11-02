export function isInlineKeyboardMarkup(markup) {
  return Array.isArray(markup?.inline_keyboard)
}

export function getTelegramEditMethod(messageType) {
  return messageType === 'photo' ? 'editMessageCaption' : 'editMessageText'
}

export function classifyTelegramEditError(error) {
  const message = String(error?.message || '').toLowerCase()
  if (message.includes('message is not modified')) return 'unchanged'
  if (
    message.includes('message to edit not found') ||
    message.includes("message can't be edited") ||
    message.includes('message_id_invalid')
  ) {
    return 'fallback'
  }
  return 'error'
}
