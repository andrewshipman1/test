// ─── Vercel Serverless Proxy for Claude API ─────────────────────────────────
// Keeps the API key server-side. Streams responses back to the client.
// Retries on 429 (rate limit) with exponential backoff.

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MAX_RETRIES = 2
const BASE_DELAY_MS = 2000

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
    return
  }

  const body = req.body
  if (!body || !body.messages) {
    res.status(400).json({ error: 'Missing messages in request body' })
    return
  }

  // Attempt with retries on 429
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      // Rate limited — retry with backoff
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      // Non-streaming response (error case)
      if (!response.ok && !body.stream) {
        const errText = await response.text()
        res.status(response.status).end(errText)
        return
      }

      // Stream the response back
      if (body.stream) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const reader = response.body.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
        } catch (streamErr) {
          // Client disconnected or stream error — just close
        }
        res.end()
        return
      }

      // Non-streaming success
      const data = await response.json()
      res.status(response.status).json(data)
      return

    } catch (err) {
      if (attempt === MAX_RETRIES) {
        res.status(502).json({ error: 'Failed to reach Claude API', detail: err.message })
        return
      }
    }
  }
}

export const config = {
  maxDuration: 60,
}
