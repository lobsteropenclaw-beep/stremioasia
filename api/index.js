const express = require('express');
const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('../lib/addon');

const app = express();

// Use the Stremio addon router
const router = getRouter(addonInterface);
app.use(router);

// Basic health check or landing page
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
