import { LockKeyhole, Mail, Moon, Phone, Sun, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/media.png'
import RegisterSwiper from '../components/swiper/RegisterSwiper'
import { activ } from '../Redux/theme'

export default function Register() {
  const theme = useSelector((state) => state.themes.theme)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Lubrix | Register'
  }, [])

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Connect this form to your backend registration endpoint.
    navigate('/checkout')
  }

  const inputClass = `w-full rounded-xl border px-4 py-3 outline-none transition focus:border-blue-500 ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-400'
      : 'border-gray-200 bg-gray-50 text-black placeholder:text-gray-500'
  }`

  return (
    <div
      className={`fixed inset-0 h-dvh w-full overflow-y-auto transition-colors duration-200 ${theme ? 'bg-surface text-white' : 'bg-white text-black'}`}
    >
      <div className="flex min-h-full flex-row-reverse">
        <RegisterSwiper />

        <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-5 py-24 sm:px-10 lg:w-1/2">
          <button
            onClick={() => dispatch(activ())}
            className={`flex cursor-pointer absolute bottom-[20px] left-[20px]  z-30 items-center rounded-lg p-2 ${theme ? 'hover:bg-white/20' : 'text-gray-500 transition hover:bg-gray-100'} `}
          >
            {theme ? <Sun /> : <Moon />}
          </button>
          <Link to="/" className="absolute left-5 top-5 flex items-center gap-3 sm:left-8 sm:top-8">
            <img src={logo} alt="Lubrix" className="w-11" />
            <div>
              <p className="font-[title] text-2xl tracking-widest">LUBRIX</p>
              <p className="font-[title] text-[10px] tracking-wider">
                Smarter Oil Change Management
              </p>
            </div>
          </Link>

          <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
            <div className="mb-2">
              <h1 className="font-[title] text-3xl tracking-widest">CREATE ACCOUNT</h1>
              <p className="mt-2 text-sm text-gray-500">
                Create your account to continue with your plan.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              Full name
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Email address
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Phone number
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  required
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+998 90 123 45 67"
                  autoComplete="tel"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Password
              <div className="relative">
                <LockKeyhole
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  required
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Confirm password
              <input
                required
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={inputClass}
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`backdrop-blur-3xl border rounded-2xl transition-all duration-300 w-full p-[20px] font-[title] tracking-wider cursor-pointer ${theme ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-black text-white border-black hover:bg-white hover:text-black'}`}
            >
              CONTINUE
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className={`font-semibold  ${theme ? 'text-white ' : 'text-black'}`}
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
