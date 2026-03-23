// =============================================================
// Support Client — Client App
// Text chat via Socket.IO
// =============================================================

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    config: {},
    socket: null,
    requestId: null,
    ua: null, // JsSIP User Agent
    sipConfig: null
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);

  const els = {
    // Screens
    screenHome: $('#screen-home'),
    screenChat: $('#screen-chat'),
    // Home
    siteNameLabel: $('#site-name-label'),
    btnTextSupport: $('#btn-text-support'),
    homeConnection: $('#home-connection'),
    // Chat
    btnChatBack: $('#btn-chat-back'),
    chatStatus: $('#chat-status'),
    chatConnectionDot: $('#chat-connection-dot'),
    chatMessages: $('#chat-messages'),
    initialMessageArea: $('#initial-message-area'),
    initialMessage: $('#initial-message'),
    btnSendInitial: $('#btn-send-initial'),
    chatInputArea: $('#chat-input-area'),
    chatInput: $('#chat-input'),
    btnSendChat: $('#btn-send-chat'),
    toastContainer: $('#toast-container')
  };

  // ---------- Screen Navigation ----------
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(`#${screenId}`).classList.add('active');
  }

  // ---------- Initialize ----------
  async function init() {
    try {
      console.log("Fetching config...");
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      state.config = await res.json();
      console.log("Config loaded:", state.config);
      
      els.siteNameLabel.textContent = state.config.site_name || 'Client Site';
      
      initSIP(state.config);
    } catch (e) {
      console.error('Fetching config failed:', e);
      showToast('error', 'Configuration Error: ' + e.message);
      if (els.siteNameLabel) els.siteNameLabel.textContent = 'Config Error';
    }
  }

  function initSIP(config) {
    const { sip_extension, sip_password, asterisk_ws_url, sip_domain } = config;

    if (!sip_extension || !sip_password || !asterisk_ws_url || !sip_domain) {
        console.error('Incomplete SIP configuration:', config);
        showToast('error', 'Incomplete SIP configuration in Options.');
        return;
    }

    console.log("Initializing SIP...");
    const socket = new JsSIP.WebSocketInterface(asterisk_ws_url);
    
    const configuration = {
      sockets: [socket],
      uri: `sip:${sip_extension}@${sip_domain}`,
      password: sip_password,
      register: true,
      session_timers: false
    };

    state.ua = new JsSIP.UA(configuration);
    
    state.ua.on('registered', () => {
        console.log('SIP initialized');
        updateChatConnection(true);
    });
    
    state.ua.on('registrationFailed', (e) => {
        console.error('JsSIP Registration failed:', e.cause);
        showToast('error', 'SIP Registration Failed: ' + e.cause);
    });

    console.log("SIP registration started");
    state.ua.start();
  }

  // ---------- Socket.IO Connection to Central ----------
  function connectSocket(callback) {
    if (state.socket && state.socket.connected) {
      if (callback) callback();
      return;
    }

    const centralUrl = state.config.central_url || 'http://localhost:3000';

    state.socket = io(centralUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    state.socket.on('connect', () => {
      updateHomeConnection(true);
      updateChatConnection(true);

      state.socket.emit('identify', {
        role: 'client',
        site_name: state.config.site_name
      });

      if (callback) callback();
    });

    state.socket.on('disconnect', () => {
      updateHomeConnection(false);
      updateChatConnection(false);
    });

    state.socket.on('chat-message', (data) => {
      if (data.request_id === state.requestId && data.sender !== 'client') {
        appendChatMessage(data);
      }
    });
  }

  // ---------- TEXT SUPPORT ----------
  els.btnTextSupport.addEventListener('click', () => {
    showScreen('screen-chat');
    connectSocket();
  });

  els.btnChatBack.addEventListener('click', () => {
    showScreen('screen-home');
  });

  // Send initial message & create request
  els.btnSendInitial.addEventListener('click', async () => {
    const message = els.initialMessage.value.trim();
    if (!message) {
      els.initialMessage.focus();
      return;
    }

    els.btnSendInitial.disabled = true;
    els.btnSendInitial.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Sending…';

    try {
      const centralUrl = state.config.central_url || 'http://localhost:3000';
      const res = await fetch(`${centralUrl}/api/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: state.config.site_name,
          type: 'text',
          message: message
        })
      });

      const data = await res.json();
      state.requestId = data.request_id;

      if (state.socket) {
        state.socket.emit('join-request', state.requestId);
      }

      els.initialMessageArea.classList.add('hidden');
      els.chatInputArea.classList.remove('hidden');
      els.chatStatus.textContent = 'Connected — Waiting for agent';

      appendChatMessage({
        sender: 'client',
        site_name: state.config.site_name,
        text: message,
        timestamp: new Date().toISOString()
      });

      showToast('success', 'Message sent! Waiting for support agent.');

    } catch (e) {
      console.error('Failed to send request:', e);
      showToast('error', 'Failed to connect. Please try again.');
      els.btnSendInitial.disabled = false;
      els.btnSendInitial.innerHTML = '<span class="material-icons-round">send</span> Send & Connect';
    }
  });

  // Send follow-up chat messages
  function sendChatMessage() {
    const text = els.chatInput.value.trim();
    if (!text || !state.requestId || !state.socket) return;

    state.socket.emit('chat-message', {
      request_id: state.requestId,
      text,
      sender: 'client',
      site_name: state.config.site_name
    });

    appendChatMessage({
      sender: 'client',
      site_name: state.config.site_name,
      text,
      timestamp: new Date().toISOString()
    });

    els.chatInput.value = '';
  }

  els.btnSendChat.addEventListener('click', sendChatMessage);
  els.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  function appendChatMessage(msg) {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.sender === 'client' ? 'client' : 'agent'}`;
    div.innerHTML = `
      <div class="msg-sender">${escapeHtml(msg.sender === 'client' ? 'You' : 'Support Agent')}</div>
      <div class="msg-text">${escapeHtml(msg.text)}</div>
      <div class="msg-time">${formatTime(msg.timestamp)}</div>
    `;
    els.chatMessages.appendChild(div);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  // ---------- Connection Status ----------
  function updateHomeConnection(connected) {
    if (els.homeConnection) {
        els.homeConnection.className = `status-pill ${connected ? 'connected' : 'disconnected'}`;
        els.homeConnection.querySelector('span:last-child').textContent = connected ? 'Connected to Support' : 'Connecting…';
    }
  }

  function updateChatConnection(connected) {
    if (els.chatConnectionDot) {
        els.chatConnectionDot.className = `status-dot-sm ${connected ? 'connected' : 'disconnected'}`;
        if (connected && !state.requestId) {
          els.chatStatus.textContent = 'Connected — Type your message below';
        }
    }
  }

  // ---------- Toast Notifications ----------
  function showToast(type, message) {
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="material-icons-round">${icons[type] || 'info'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease-in reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ---------- Helpers ----------
  function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Init ----------
  init();

})();
