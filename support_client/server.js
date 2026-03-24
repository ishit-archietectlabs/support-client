// =============================================================
// Support Client — Server
// Simple Express server that serves the client UI and config
// =============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// --- Process Stability ---
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Keep process alive
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Provide config from local options.json (Supervisor UI writes to this file)
app.get('/api/config', (req, res) => {
  try {
    const data = fs.readFileSync('/data/options.json', 'utf8');
    const options = JSON.parse(data);
    console.log("Loaded config from options");
    res.json(options);
  } catch (e) {
    console.error("Config file not found or invalid. Using defaults.", e.message);
    res.json({
        central_url: "http://homeassistant.local:3000",
        site_name: "Client Site",
        sip_extension: "site1",
        sip_password: "site123",
        asterisk_ws_url: "ws://192.168.1.104:8088/ws",
        sip_domain: "192.168.1.104"
    });
  }
});

const PORT = process.env.PORT || 3001;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CLIENT] Support Client successfully listening on port ${PORT}`);
    console.log(`[CLIENT] Access at http://<addon-ip>:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[CRITICAL] Server failed to start:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    }
  });
} catch (e) {
  console.error('[CRITICAL] Fatal error during app.listen:', e.message);
}
