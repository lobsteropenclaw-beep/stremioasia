const express = require('express');
const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('../lib/addon');

const app = express();

// Enable CORS for Stremio
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Use the Stremio addon router
const router = getRouter(addonInterface);
app.use(router);

// Landing page redirect
app.get('/', (req, res) => {
  res.redirect('/manifest.json');
});

module.exports = app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 7000;
  app.listen(port, () => {
    console.log(`Addon active on http://localhost:${port}/manifest.json`);
  });
}
