import { LockKeyhole, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import logo from '../assets/media.png'
import Input from '../components/mini/Input'
import LoginSwiper from '../components/swiper/LoginSwiper'
export default function Login() {
  return (
    <div className="absolute top-0 left-0 h-screen w-screen">
      <div className="flex w-full h-screen">
        <LoginSwiper />

        <div className="lg:w-[50%] w-full h-full flex justify-center items-center flex-col">
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
            <button className=" bg-black backdrop-blur-3xl border border-[0.1px] border-black text-white rounded-2xl hover:bg-white hover:text-black transition-all duration-300 w-full p-[20px] font-[title] tracking-wider">
              S U B M I T
            </button>
            <button type="button">
              <div className="mt-6 [letter-spacing:2px] font-[title] flex gap-[10px] text-center text-sm text-gray-500">
                <span> Don't have an account?</span>{' '}
                <Link
                  to="/register"
                  className="font-semibold text-black transition hover:text-black/80"
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
