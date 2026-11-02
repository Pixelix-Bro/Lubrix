const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maximumImageBytes = 1_500_000

export const fileToImageDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!allowedImageTypes.has(file?.type)) {
      reject(new Error('JPEG, PNG yoki WebP rasm tanlang.'))
      return
    }
    if (file.size > maximumImageBytes) {
      reject(new Error('Rasm hajmi 1.5 MB dan oshmasligi kerak.'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Rasm faylini o‘qib bo‘lmadi.'))
    reader.readAsDataURL(file)
  })
