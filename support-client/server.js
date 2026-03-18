// =============================================================
// Support Client — Server
// Simple Express server that serves the client UI and config
// =============================================================

const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Provide runtime config from HA options (env vars)
app.get('/api/config', (req, res) => {
  res.json({
    central_url: process.env.CENTRAL_URL || 'http://localhost:3000',
    site_name: process.env.SITE_NAME || 'Remote Site',
    sip_extension: process.env.SIP_EXTENSION || 'client_1',
    sip_password: process.env.SIP_PASSWORD || 'changeme_client',
    asterisk_ws_url: process.env.ASTERISK_WS_URL || 'wss://localhost:8089/ws',
    sip_domain: process.env.SIP_DOMAIN || 'localhost'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CLIENT] Support Client running on port ${PORT}`);
});
