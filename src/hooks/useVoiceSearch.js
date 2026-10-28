import { useCallback, useEffect, useRef, useState } from 'react'

export function useVoiceSearch({ onResult, lang = 'uz-UZ' } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      const current = event.resultIndex
      const text = event.results[current][0].transcript
      setTranscript(text)

      if (event.results[current].isFinal) {
        if (onResult) {
          onResult(text)
        }
      }
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Mikrofonga ruxsat berilmadi.')
      } else if (event.error === 'no-speech') {
        setError('Ovoz eshitilmadi. Qayta urinib ko‘ring.')
      } else {
        setError(`Ovozni aniqlashda xatolik: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [lang, onResult])

  const startListening = useCallback((customLang) => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    try {
      if (customLang) {
        recognitionRef.current.lang = customLang
      }
      recognitionRef.current.start()
    } catch (e) {
      console.warn('Failed to start speech recognition:', e)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      // ignore
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  }
}
