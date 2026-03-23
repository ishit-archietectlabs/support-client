// =============================================================
// Support Client — Server
// Simple Express server that serves the client UI and config
// =============================================================

const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Provide manual config (Supervisor-free)
app.get('/api/config', (req, res) => {
  console.log("Using manual config");
  res.json({
    asterisk_ws_url: "ws://192.168.1.104:8088/ws",
    sip_username: "site1",
    sip_password: "site123",
    sip_domain: "192.168.1.104"
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CLIENT] Support Client running on port ${PORT}`);
});
