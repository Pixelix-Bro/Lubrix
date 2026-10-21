import { useSelector } from 'react-redux'

export default function Top() {
  const value = useSelector((state) => state.sidebar.value)
  return (
    <div
      className={`fixed right-0 ${value ? 'w-[96%] ' : 'w-[87%]'} pl-[10px] bg-white  h-[67px] border-b-[0.1px] border-gray-300`}
    ></div>
  )
}
