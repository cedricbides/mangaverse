import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()
const MD = 'https://api.mangadex.org'

// GET /api/mangadex/manga-chapters/:mangaId
// Returns all English chapters for a manga (for the admin chapter picker)
router.get('/manga-chapters/:mangaId', async (req: Request, res: Response) => {
  try {
    const { mangaId } = req.params
    const chapters: any[] = []
    let offset = 0
    const limit = 96

    // Paginate through all chapters
    while (true) {
      const url = `${MD}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&order[chapter]=asc`
      const r = await axios.get(url, {
        headers: { 'User-Agent': 'MangaVerse/1.0' },
      })
      const data = r.data.data || []
      chapters.push(...data)
      if (data.length < limit || chapters.length >= (r.data.total || 0)) break
      offset += limit
    }

    // Return simplified list
    const list = chapters.map((c: any) => ({
      id: c.id,
      chapter: c.attributes.chapter,
      title: c.attributes.title,
      volume: c.attributes.volume,
      pages: c.attributes.pages,
      publishAt: c.attributes.publishAt,
      language: c.attributes.translatedLanguage || 'en',
    }))

    res.setHeader('Cache-Control', 'no-store')
    res.json(list)
  } catch (err: any) {
    console.error('manga-chapters error:', err.response?.data || err.message)
    const status = err.response?.status || 500
    res.status(status).json({ error: 'Failed to fetch chapters from MangaDex', detail: err.response?.data })
  }
})

// GET /api/mangadex/chapter-pages/:chapterId
// Returns fresh image URLs from the at-home server (URLs expire, always fetch fresh)
router.get('/chapter-pages/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params
    const r = await axios.get(`${MD}/at-home/server/${chapterId}`, {
      headers: { 'User-Agent': 'MangaVerse/1.0' },
    })
    const { baseUrl, chapter } = r.data
    const pages = chapter.data.map((f: string) => `${baseUrl}/data/${chapter.hash}/${f}`)
    res.json({ pages })
  } catch (err: any) {
    const status = err.response?.status || 500
    res.status(status).json({ error: 'Failed to fetch page URLs from MangaDex' })
  }
})

// Generic proxy: forwards any GET to MangaDex API
router.get('/*', async (req: Request, res: Response) => {
  try {
    const path = req.params[0]
    const response = await axios.get(`${MD}/${path}`, {
      params: req.query,
      headers: { 'User-Agent': 'MangaVerse/1.0' },
    })
    res.json(response.data)
  } catch (err: any) {
    const status = err.response?.status || 500
    const message = err.response?.data || { message: 'MangaDex API error' }
    res.status(status).json(message)
  }
})

export default router