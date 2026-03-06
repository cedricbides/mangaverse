import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Menu, X, BookOpen, LogOut, User, Shield, Heart, Settings, Sun, Moon, BookMarked } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// Generates a consistent avatar based on user's name
const getAvatar = (name: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}`

const userAvatar = (user: { avatar: string; name: string }) =>
  user.avatar && user.avatar.trim() !== '' ? user.avatar : getAvatar(user.name)

type Theme = 'dark' | 'light' | 'dim'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark'
  })

  // ✅ Apply theme class to <html> whenever it changes
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('theme-dark', 'theme-dim', 'theme-light')
    html.classList.add(`theme-${theme}`)
    localStorage.setItem('theme', theme)
  }, [theme])

  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setDropdownOpen(false) }, [location])

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    ['/', 'Home'],
    ['/browse', 'Browse'],
    ['/catalog', 'Catalog'],
  ]

  const themes: { value: Theme; label: string; icon: any }[] = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'dim', label: 'Dim', icon: BookMarked },
    { value: 'light', label: 'Light', icon: Sun },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
      scrolled ? 'py-2.5 bg-bg/95 backdrop-blur-2xl border-b border-white/5' : 'py-4 bg-bg/80 backdrop-blur-xl'
    }`}>
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(232,57,77,0.5)]">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-display text-2xl tracking-wider text-text group-hover:text-primary transition-colors">
            MANGAVERSE
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(([path, label]) => (
            <Link key={path} to={path}
              className={`font-body text-sm transition-colors ${isActive(path) ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">

          {/* Search bar */}
          <div className={`hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 transition-all duration-300 ${
            searchOpen ? 'w-56' : 'w-10 cursor-pointer'
          }`} onClick={() => !searchOpen && setSearchOpen(true)}>
            <Search size={15} className="text-text-muted flex-shrink-0" />
            {searchOpen && (
              <form onSubmit={(e) => { e.preventDefault(); if (query) { navigate(`/browse?q=${query}`); setSearchOpen(false); setQuery('') } }}>
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => { if (!query) setSearchOpen(false) }}
                  placeholder="Search manga..."
                  className="bg-transparent text-sm text-text placeholder-text-muted outline-none w-full font-body" />
              </form>
            )}
            {searchOpen && (
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-text-muted bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono flex-shrink-0">
                Esc
              </kbd>
            )}
          </div>

          {/* Admin badge */}
          {isAdmin && (
            <Link to="/admin" className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-body hover:bg-amber-500/30 transition-colors">
              <Shield size={13} /> Admin
            </Link>
          )}

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {user ? (
                <img src={userAvatar(user)} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <User size={17} className="text-text-muted" />
              )}
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">

                {/* User info */}
                <div className="flex flex-col items-center gap-2 px-5 py-5 border-b border-white/10">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {user ? (
                      <img src={userAvatar(user)} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-text-muted" />
                    )}
                  </div>
                  <span className="font-display text-lg text-text tracking-wide">
                    {user ? user.name : 'Guest'}
                  </span>
                </div>

                {/* Menu items */}
                <div className="px-3 py-3 flex flex-col gap-1">
                  <div className="flex gap-2 mb-1">
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-text-muted hover:text-text hover:bg-white/5 text-sm font-body transition-all">
                      <Settings size={15} />
                      Settings
                    </Link>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-text-muted hover:text-text hover:bg-white/5 text-sm font-body transition-all cursor-pointer">
                      <Sun size={15} />
                      Theme
                    </div>
                  </div>

                  {/* Theme selector */}
                  <div className="flex gap-1.5 px-1 mb-2">
                    {themes.map(({ value, label, icon: Icon }) => (
                      <button key={value} onClick={() => setTheme(value)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-body transition-all ${
                          theme === value
                            ? 'bg-primary/20 border border-primary/40 text-primary'
                            : 'bg-white/5 border border-white/5 text-text-muted hover:bg-white/10'
                        }`}>
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {user && (
                    <Link to="/favorites" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-text-muted hover:text-text hover:bg-white/5 text-sm font-body transition-all">
                      <Heart size={15} />
                      Favorites
                    </Link>
                  )}
                </div>

                {/* Sign in / out */}
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {user ? (
                    <button onClick={() => { logout(); setDropdownOpen(false) }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-text rounded-xl text-sm font-body transition-all">
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center justify-center py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-body font-medium transition-all hover:shadow-[0_0_20px_rgba(232,57,77,0.4)]">
                        Sign In
                      </Link>
                      <Link to="/login" onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-text rounded-xl text-sm font-body transition-all">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-text-muted" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mx-4 mt-2 bg-surface border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          {navLinks.map(([path, label]) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)}
              className={`text-sm font-body py-1 ${isActive(path) ? 'text-primary' : 'text-text-muted'}`}>
              {label}
            </Link>
          ))}
          <div className="h-px bg-white/10 my-1" />
          {user ? (
            <>
              <Link to="/favorites" onClick={() => setMenuOpen(false)} className="text-sm font-body py-1 text-text-muted flex items-center gap-2">
                <Heart size={14} /> Favorites
              </Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-sm font-body py-1 text-text-muted flex items-center gap-2">
                <Settings size={14} /> Settings
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm font-body py-1 text-amber-400 flex items-center gap-2">
                  <Shield size={14} /> Admin Dashboard
                </Link>
              )}
              <button onClick={() => { logout(); setMenuOpen(false) }} className="text-sm font-body py-1 text-text-muted flex items-center gap-2">
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 bg-primary text-white rounded-xl text-sm font-body">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}