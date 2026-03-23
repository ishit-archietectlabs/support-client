// =============================================================
// Support Client — Server
// Simple Express server that serves the client UI and config
// =============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CLIENT] Support Client running on port ${PORT}`);
});
