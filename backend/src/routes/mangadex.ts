import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()
const MD = 'https://api.mangadex.org'

// Generic proxy: forwards any GET request to MangaDex API
// e.g. GET /api/mangadex/manga?limit=12 → https://api.mangadex.org/manga?limit=12
router.get('/*', async (req: Request, res: Response) => {
  try {
    const path = req.params[0] // everything after /api/mangadex/
    const response = await axios.get(`${MD}/${path}`, {
      params: req.query,
      headers: {
        'User-Agent': 'MangaVerse/1.0',
      },
    })
    res.json(response.data)
  } catch (err: any) {
    const status = err.response?.status || 500
    const message = err.response?.data || { message: 'MangaDex API error' }
    res.status(status).json(message)
  }
})

export default router


