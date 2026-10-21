import { useEffect } from 'react'
import img from '../assets/Logo.png'
export default function Home() {
  useEffect(() => {
    document.title = 'Lubrix | Dashboard'
  }, [])
  return (
    <div>
      <img  className='w-[400px]' src={img} alt="" />
    </div>
  )
}
