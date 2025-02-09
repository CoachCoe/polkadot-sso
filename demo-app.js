import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Demo App</h1>
        <a href="http://localhost:3000/login?client_id=demo-app">Login with Polkadot</a>
      </body>
    </html>
  `);
});

app.get('/callback', (req, res) => {
  const { token } = req.query;
  res.send(`
    <html>
      <body>
        <h1>Logged in!</h1>
        <p>Token: ${token}</p>
      </body>
    </html>
  `);
});

app.listen(3001, () => {
  console.log('Demo app running on port 3001');
});
