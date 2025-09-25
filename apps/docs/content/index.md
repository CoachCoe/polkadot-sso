---
title: Polkadot SSO
description: Production-ready authentication for the Polkadot ecosystem
navigation: false
---

::u-page-hero
---
orientation: horizontal
---

#title
Polkadot [SSO]{.text-primary}

#description
Production-ready authentication for the Polkadot ecosystem — Secure wallet integration, JWT sessions, and seamless framework support.

#links
  :::u-button
  ---
  color: primary
  size: xl
  to: /implementation/getting-started
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/polkadot-auth/polkadot-sso
  target: _blank
  variant: outline
  ---
  View on GitHub
  :::

#default
```js [server.js]
const express = require('express');
const { polkadotAuth } = require('@polkadot-auth/express');

const app = express();

app.use('/auth', polkadotAuth({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET
  }
}));

app.listen(3000);
```
::
