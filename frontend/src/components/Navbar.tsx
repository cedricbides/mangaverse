import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Heart, Menu, X, BookOpen, LogOut, User, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    ['/', 'Home'],
    ['/browse', 'Browse'],
    ['/catalog', 'Catalog'],
    ['/trending', 'Trending'],
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
      scrolled ? 'py-2.5 bg-[#09090f]/90 backdrop-blur-2xl border-b border-white/5' : 'py-5 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(232,57,77,0.5)]">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-display text-2xl tracking-wider text-white group-hover:text-primary transition-colors">
            MANGAVERSE
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(([path, label]) => (
            <Link key={path} to={path}
              className={`font-body text-sm transition-colors ${isActive(path) ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className={`hidden md:flex items-center gap-2 glass rounded-xl px-3 py-2 transition-all duration-300 ${
            searchOpen ? 'w-56' : 'w-10 cursor-pointer'
          }`} onClick={() => !searchOpen && setSearchOpen(true)}>
            <Search size={15} className="text-text-muted flex-shrink-0" />
            {searchOpen && (
              <form onSubmit={(e) => { e.preventDefault(); if (query) window.location.href = `/browse?q=${query}` }}>
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => { if (!query) setSearchOpen(false) }}
                  placeholder="Search manga..."
                  className="bg-transparent text-sm text-text placeholder-text-muted outline-none w-full font-body" />
              </form>
            )}
          </div>

          {user ? (
            <>
              <Link to="/favorites" className="p-2 glass rounded-xl text-text-muted hover:text-primary transition-colors">
                <Heart size={17} />
              </Link>
              <Link to="/profile" className="p-2 glass rounded-xl text-text-muted hover:text-accent transition-colors">
                <User size={17} />
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-body hover:bg-amber-500/30 transition-colors">
                  <Shield size={13} /> Admin
                </Link>
              )}
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs text-primary font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm text-text hidden sm:block font-body">{user.name.split(' ')[0]}</span>
              </div>
              <button onClick={logout} className="p-2 glass rounded-xl text-text-muted hover:text-primary transition-colors">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-body text-sm rounded-xl transition-all hover:shadow-[0_0_20px_rgba(232,57,77,0.4)]">
              Sign In
            </Link>
          )}

          <button className="md:hidden p-2 text-text-muted" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mx-4 mt-2 glass rounded-2xl p-5 flex flex-col gap-4">
          {[...navLinks, ['/favorites', 'Favorites'], ['/profile', 'Profile']].map(([path, label]) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)}
              className={`text-sm font-body py-1 ${isActive(path) ? 'text-primary' : 'text-text-muted'}`}>
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm font-body py-1 text-amber-400 flex items-center gap-2">
              <Shield size={14} /> Admin Dashboard
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
