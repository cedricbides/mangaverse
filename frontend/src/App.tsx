import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import Browse from '@/pages/Browse'
import Catalog from '@/pages/Catalog'
import MangaDetail from '@/pages/MangaDetail'
import Reader from '@/pages/Reader'
import Favorites from '@/pages/Favorites'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import Admin from '@/pages/Admin'
import LocalMangaDetail from '@/pages/LocalMangaDetail'
import LocalReader from '@/pages/LocalReader'
import ManualReader from '@/pages/ManualReader'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/browse" element={<Layout><Browse /></Layout>} />
          <Route path="/catalog" element={<Layout><Catalog /></Layout>} />
          <Route path="/trending" element={<Layout><Browse /></Layout>} />
          <Route path="/manga/:id" element={<Layout><MangaDetail /></Layout>} />
          <Route path="/read/:chapterId" element={<Reader />} />
          <Route path="/favorites" element={<Layout><Favorites /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/local/:id" element={<Layout><LocalMangaDetail /></Layout>} />
          <Route path="/read/local/:chapterId" element={<LocalReader />} />
          <Route path="/read/manual/:chapterId" element={<ManualReader />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}