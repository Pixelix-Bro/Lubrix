import { LockKeyhole, Moon, Sun, User } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import logo from '../assets/media.png'
import Input from '../components/mini/Input'
import LoginSwiper from '../components/swiper/LoginSwiper'
import { activ } from '../Redux/theme'
export default function Login() {
  const theme = useSelector((state) => state.themes.theme)
  const dispatch = useDispatch()
  useEffect(() => {
    document.title = 'Lubrix | Login'
  }, [])
  const images = [
    '/loginPhoto/LoginPhoto.jpg',
    '/loginPhoto/LoginPhoto.jpeg',
    '/loginPhoto/LoginPhoto1.jpg',
    '/loginPhoto/LoginPhoto2.jpg',
  ]

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])
  return (
    <div
      className={`absolute top-0 transition-all duration-200 ${theme ? 'bg-surface' : 'bg-white'} left-0 h-screen w-screen`}
    >
      <div className="flex w-full h-screen">
        <LoginSwiper />

        <div className="lg:w-[50%] relative w-full h-full flex justify-center items-center flex-col">
          <button
            onClick={() => dispatch(activ())}
            className={`flex cursor-pointer absolute bottom-[20px] right-[20px] z-30 items-center rounded-lg p-2 ${theme ? 'hover:bg-white/20' : 'text-gray-500 transition hover:bg-gray-100'} `}
          >
            {theme ? <Sun /> : <Moon />}
          </button>
          <div className="head absolute right-0 top-0 z-50 flex items-center gap-[10px]">
            <img src={logo} alt="Logo" className="w-[50px]" />
            <div className="min-w-0 flex-1 justify-end">
              <p className="truncate font-[title] text-3xl tracking-widest">LUBRIX</p>
              <p className="truncate font-[title] text-[10px] tracking-wider">
                Smarter Oil Change Management
              </p>
            </div>
          </div>
          <form className="flex flex-col  items-center gap-[20px] lg:w-[50%] w-[80%]">
            <Input names={'Email or Number'} type={'email'} icon={<User />} />
            <Input names={'Enter Password'} type={'password'} icon={<LockKeyhole />} />
            <button
              className={`backdrop-blur-3xl border rounded-2xl transition-all duration-300 w-full p-[20px] font-[title] tracking-wider cursor-pointer ${theme ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-black text-white border-black hover:bg-white hover:text-black'}`}
            >
              S U B M I T
            </button>
            <button type="button">
              <div className="mt-6 [letter-spacing:2px] font-[title] flex gap-[10px] text-center text-sm text-gray-500">
                <span> Don't have an account?</span>{' '}
                <Link
                  to="/plans"
                  className={`font-semibold  ${theme ? 'text-white' : 'text-black'}`}
                >
                  Sign up
                </Link>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
