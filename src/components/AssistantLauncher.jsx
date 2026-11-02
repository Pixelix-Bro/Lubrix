import { Mic } from 'lucide-react'
import { useState } from 'react'
import VoiceAssistantModal from './VoiceAssistantModal'

export default function AssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={speechSupported ? 'Ovozli CRM qidiruvi va AI yordam' : 'CRM qidiruvi va AI yordam'}
        aria-label="CRM qidiruvi va AI yordamni ochish"
        className="fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Mic size={19} aria-hidden="true" />
      </button>
      <VoiceAssistantModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
