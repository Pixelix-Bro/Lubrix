import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

export default function SiteBarButton({ p, n, i }) {
  const value = useSelector((state) => state.sidebar.value)

  return (
    <Link
      to={p}
      className="flex items-center justify-center gap-[5px] !text-[18px] text-start p-[10px] hover:text-yellow-500 hover:bg-yellow-100 transition-all duration-200 rounded-xl"
    >
      {i}
      {!value && <span>{n}</span>}
    </Link>
  )
}
