import { createServer } from "http"

const server = createServer()

const PORT = process.env.PORT || 3001

server.on('request', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }))
    return
  }

  if (req.url === '/api/auth/polkadot/challenge' && req.method === 'POST') {
    res.writeHead(200)
    res.end(JSON.stringify({
      message: "Sign this message to authenticate with Polkadot SSO",
      nonce: "test-nonce-" + Date.now(),
      chain: "polkadot",
      expiresAt: Date.now() + 300000
    }))
    return
  }

  if (req.url === '/api/auth/polkadot/verify' && req.method === 'POST') {
    res.writeHead(200)
    res.end(JSON.stringify({
      user: {
        id: "test-user-" + Date.now(),
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
        chain: "polkadot",
        provider: "polkadot-js",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      session: {
        id: "test-session-" + Date.now(),
        userId: "test-user-" + Date.now(),
        token: "test-jwt-token-" + Date.now(),
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date()
      },
      token: "test-jwt-token-" + Date.now()
    }))
    return
  }

  if (req.url === '/api/auth/session' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({
      user: null,
      session: null
    }))
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(PORT, () => {
  console.log(`🚀 Polkadot SSO server running on port ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/auth`)
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`)
})

export default server