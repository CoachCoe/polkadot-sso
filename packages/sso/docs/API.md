# Polkadot SSO API Documentation

## Overview

The Polkadot SSO service provides a secure authentication system for Polkadot-based applications. It implements the OAuth 2.0 authorization code flow with PKCE (Proof Key for Code Exchange) and supports Polkadot wallet integration.

## Base URL

```
http://localhost:3000
```

## Authentication

The API uses OAuth 2.0 with PKCE for authentication. Clients must be registered and approved to use the service.

## Rate Limiting

All endpoints are rate limited to prevent abuse:

- **Challenge Generation**: 10 requests per minute per IP
- **Login**: 5 requests per minute per IP
- **Verification**: 5 requests per minute per IP
- **Token Exchange**: 10 requests per minute per IP
- **Logout**: 5 requests per minute per IP
- **Status Check**: 30 requests per minute per IP

## Endpoints

### 1. Challenge Generation

Generate a challenge for wallet signature verification.

**Endpoint:** `GET /api/auth/challenge`

**Query Parameters:**
- `client_id` (required): Registered client identifier
- `address` (required): Polkadot address to authenticate

**Response:**
- **200 OK**: HTML page with challenge details
- **400 Bad Request**: Missing or invalid parameters
- **401 Unauthorized**: Invalid client ID
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/challenge?client_id=polkadot-password-manager&address=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
```

**Example Response:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Polkadot SSO Challenge</title>
</head>
<body>
    <h1>Authentication Challenge</h1>
    <p>Address: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY</p>
    <p>Challenge ID: abc123-def456-ghi789</p>
    <p>Message: Please sign this message to authenticate...</p>
    <script nonce="random-nonce">
        // Challenge verification script
    </script>
</body>
</html>
```

### 2. Challenge Status

Check the status of a challenge.

**Endpoint:** `GET /api/auth/status/:challengeId`

**Path Parameters:**
- `challengeId` (required): The challenge identifier

**Response:**
- **200 OK**: Challenge status information
- **404 Not Found**: Challenge not found
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/status/abc123-def456-ghi789"
```

**Example Response:**
```json
{
  "status": "pending",
  "message": "Challenge is pending verification",
  "expiresAt": 1640995200000,
  "challengeId": "abc123-def456-ghi789"
}
```

### 3. Login Initiation

Initiate the login process with wallet selection.

**Endpoint:** `GET /api/auth/login`

**Query Parameters:**
- `client_id` (required): Registered client identifier
- `address` (required): Polkadot address to authenticate
- `wallet` (required): Wallet type (e.g., "polkadot-js")

**Response:**
- **200 OK**: HTML page with login form
- **400 Bad Request**: Missing or invalid parameters
- **401 Unauthorized**: Invalid client ID
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/login?client_id=polkadot-password-manager&address=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY&wallet=polkadot-js"
```

### 4. Signature Verification

Verify the wallet signature and complete authentication.

**Endpoint:** `GET /api/auth/verify`

**Query Parameters:**
- `signature` (required): Wallet signature of the challenge message
- `challenge_id` (required): Challenge identifier
- `address` (required): Polkadot address that signed the message
- `code_verifier` (required): PKCE code verifier
- `state` (required): OAuth state parameter

**Response:**
- **302 Found**: Redirect to client with authorization code
- **400 Bad Request**: Invalid signature or parameters
- **401 Unauthorized**: Signature verification failed
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/verify?signature=0x1234...&challenge_id=abc123-def456-ghi789&address=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY&code_verifier=code_verifier_123&state=state_456"
```

### 5. Token Exchange

Exchange authorization code for access and refresh tokens.

**Endpoint:** `POST /api/auth/token`

**Request Body:**
```json
{
  "code": "authorization_code_here",
  "client_id": "polkadot-password-manager"
}
```

**Response:**
- **200 OK**: Token response
- **400 Bad Request**: Invalid authorization code
- **401 Unauthorized**: Invalid client credentials
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"code": "auth_code_123", "client_id": "polkadot-password-manager"}'
```

**Example Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 6. Logout

Invalidate a user session.

**Endpoint:** `POST /api/auth/logout`

**Request Body:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
- **200 OK**: Logout successful
- **400 Bad Request**: Missing access token
- **401 Unauthorized**: Invalid access token
- **429 Too Many Requests**: Rate limit exceeded

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

**Example Response:**
```json
{
  "message": "Logged out successfully"
}
```

### 7. Authorization Callback

Handle OAuth callback from client applications.

**Endpoint:** `GET /api/auth/callback`

**Query Parameters:**
- `code` (required): Authorization code
- `state` (required): OAuth state parameter
- `error` (optional): Error code if authorization failed

**Response:**
- **200 OK**: Callback information
- **400 Bad Request**: Missing parameters or authorization failed

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/callback?code=auth_code_123&state=state_456"
```

**Example Response:**
```json
{
  "message": "Authorization successful",
  "code": "auth_code_123",
  "state": "state_456",
  "next_step": "Exchange code for tokens using POST /token"
}
```

### 8. API Documentation

Get interactive API documentation.

**Endpoint:** `GET /api/auth/docs`

**Response:**
- **200 OK**: HTML documentation page

**Example Request:**
```bash
curl "http://localhost:3000/api/auth/docs"
```

### 9. Health Check

Check service health status.

**Endpoint:** `GET /health`

**Response:**
- **200 OK**: Service is healthy

**Example Request:**
```bash
curl "http://localhost:3000/health"
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-31T23:59:59.000Z",
  "service": "polkadot-sso",
  "version": "1.0.0"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": 1640995200000,
  "requestId": "req_123456789"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request parameters
- `UNAUTHORIZED`: Invalid client or authentication failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `CHALLENGE_NOT_FOUND`: Challenge ID not found
- `CHALLENGE_EXPIRED`: Challenge has expired
- `CHALLENGE_USED`: Challenge has already been used
- `SIGNATURE_VERIFICATION_FAILED`: Wallet signature verification failed
- `TOKEN_EXCHANGE_FAILED`: Authorization code exchange failed
- `SESSION_NOT_FOUND`: Session not found
- `INTERNAL_SERVER_ERROR`: Internal server error

## Security Considerations

### 1. Rate Limiting
- All endpoints are rate limited to prevent abuse
- Rate limits are applied per IP address
- Exceeded limits return HTTP 429 with retry-after header

### 2. Input Validation
- All inputs are validated and sanitized
- SQL injection and XSS attempts are blocked
- Request size limits prevent DoS attacks

### 3. CORS Protection
- Only authorized origins are allowed
- Preflight requests are handled properly
- Credentials are not exposed to unauthorized domains

### 4. Content Security Policy
- Strict CSP headers prevent XSS attacks
- Nonce-based script execution
- Inline scripts are blocked

### 5. JWT Security
- Strong secrets are required (32+ characters)
- Tokens are signed with HMAC-SHA256
- Short expiration times (15 minutes for access tokens)
- Secure refresh token rotation

### 6. Audit Logging
- All authentication events are logged
- Failed attempts are tracked
- Security events are monitored
- Logs are retained for compliance

## Client Registration

To use the SSO service, clients must be registered with the following information:

- `client_id`: Unique identifier for the client
- `client_secret`: Secret key for token exchange
- `name`: Human-readable client name
- `redirect_url`: OAuth callback URL
- `allowed_origins`: List of allowed CORS origins

## Example Integration

### 1. Generate Challenge
```javascript
const challengeUrl = `http://localhost:3000/api/auth/challenge?client_id=my-app&address=${userAddress}`;
window.open(challengeUrl, '_blank');
```

### 2. Check Challenge Status
```javascript
const statusResponse = await fetch(`http://localhost:3000/api/auth/status/${challengeId}`);
const status = await statusResponse.json();
```

### 3. Exchange Authorization Code
```javascript
const tokenResponse = await fetch('http://localhost:3000/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: authorizationCode,
    client_id: 'my-app'
  })
});
const tokens = await tokenResponse.json();
```

### 4. Use Access Token
```javascript
const apiResponse = await fetch('https://api.example.com/protected', {
  headers: { 'Authorization': `Bearer ${tokens.access_token}` }
});
```

## Support

For technical support or questions about the API, please contact the development team or refer to the project documentation.
