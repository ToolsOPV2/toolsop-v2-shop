import express from 'express'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env')

  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')

  for (const line of content.split('\n')) {
    const cleanLine = line.trim()

    if (!cleanLine || cleanLine.startsWith('#')) continue

    const separatorIndex = cleanLine.indexOf('=')

    if (separatorIndex === -1) continue

    const key = cleanLine.slice(0, separatorIndex).trim()
    const value = cleanLine.slice(separatorIndex + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

const app = express()
const PORT = process.env.PORT || 10000

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return undefined
  return String(value)
}

async function callNetlifyFunction(functionName, req, res) {
  try {
    const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`)

    if (!fs.existsSync(functionPath)) {
      return res.status(404).json({
        ok: false,
        error: `Fonction introuvable: ${functionName}`,
      })
    }

    const moduleUrl = pathToFileURL(functionPath).href
    const mod = await import(`${moduleUrl}?t=${Date.now()}`)

    if (typeof mod.handler !== 'function') {
      return res.status(500).json({
        ok: false,
        error: `La fonction ${functionName} n'exporte pas handler`,
      })
    }

    const event = {
      httpMethod: req.method,
      path: req.path,
      headers: req.headers,
      queryStringParameters: req.query || {},
      body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '',
      isBase64Encoded: false,
    }

    const result = await mod.handler(event, {})

    const statusCode = result?.statusCode || 200
    const headers = result?.headers || {}

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'set-cookie') {
        const cookies = Array.isArray(value) ? value : [value]

        for (const cookie of cookies) {
          res.append('Set-Cookie', cookie)
        }
      } else {
        const headerValue = normalizeHeaderValue(value)

        if (headerValue !== undefined) {
          res.setHeader(key, headerValue)
        }
      }
    }

    if (result?.body === undefined || result?.body === null) {
      return res.status(statusCode).end()
    }

    const contentType = headers['Content-Type'] || headers['content-type'] || ''

    if (contentType.includes('application/json')) {
      try {
        return res.status(statusCode).json(JSON.parse(result.body))
      } catch {
        return res.status(statusCode).send(result.body)
      }
    }

    return res.status(statusCode).send(result.body)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      ok: false,
      error: error.message,
    })
  }
}

app.all('/.netlify/functions/:functionName', async (req, res) => {
  await callNetlifyFunction(req.params.functionName, req, res)
})

const distPath = path.join(__dirname, 'dist')

app.use(express.static(distPath))

app.use((req, res) => {
  if (req.method !== 'GET') {
    return res.status(404).json({
      ok: false,
      error: 'Route introuvable',
    })
  }

  return res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ToolsOp V2 lancé sur le port ${PORT}`)
})