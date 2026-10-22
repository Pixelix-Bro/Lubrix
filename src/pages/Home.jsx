import { useEffect } from 'react'
export default function Home() {
  useEffect(() => {
    document.title = 'Lubrix | Dashboard'
  }, [])
  return (
    <div className="flex flex-col">
      <h1>de</h1>
    </div>
  )
}
