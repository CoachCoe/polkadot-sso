import { createServer } from "http"
import { auth } from "./server.js"

const PORT = process.env.PORT || 3001

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'polkadot-sso'
    }))
    return
  }

  try {
    const url = `http://${req.headers.host}${req.url}`
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as any,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined
    })
    
    const response = await auth.handler(request)
    
    if (response) {
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      res.end(await response.text())
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not Found' }))
    }
  } catch (error) {
    console.error('Server error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    }))
  }
})

server.listen(PORT, () => {
  console.log(`🚀 Polkadot SSO server running on port ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/auth`)
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`)
  console.log(`🔐 Better Auth integration active`)
})

export default server