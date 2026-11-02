const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/
const MAX_IMAGE_DATA_URL_LENGTH = 2_100_000

export const isValidImageDataUrl = (value) =>
  typeof value === 'string' &&
  value.length <= MAX_IMAGE_DATA_URL_LENGTH &&
  IMAGE_DATA_URL_PATTERN.test(value)
