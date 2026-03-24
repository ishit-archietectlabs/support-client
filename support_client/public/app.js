// =============================================================
// Support Client — Client App
// Purged Socket.IO — Pure JsSIP WebRTC (v1.2.8)
// =============================================================

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    config: {},
    ua: null, // JsSIP User Agent
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
    console.log("Initializing Support Client v1.2.8...");
    
    // Set static UI labels
    if (els.siteNameLabel) els.siteNameLabel.textContent = 'Remote Site (site1)';
    
    // Explicit Hardcoded SIP Initialization per requirements
    initSIP();
  }

  function initSIP() {
    const WSS_URL = 'wss://j788dlew.niti.life:8089/ws';
    const SIP_URI = 'sip:site1@j788dlew.niti.life';
    const SIP_PWD = 'site123';

    console.log("Initializing SIP...");
    console.log("WebSocket URL:", WSS_URL);
    console.log("SIP URI:", SIP_URI);

    try {
      const socket = new JsSIP.WebSocketInterface(WSS_URL);
      
      const configuration = {
        sockets: [socket],
        uri: SIP_URI,
        password: SIP_PWD,
        register: true,
        session_timers: false
      };

      state.ua = new JsSIP.UA(configuration);
      
      state.ua.on('registered', () => {
          console.log('SIP initialized');
          console.log('SIP registration started');
          updateHomeConnection(true);
          updateChatConnection(true);
          showToast('success', 'Connected to Asterisk');
      });
      
      state.ua.on('registrationFailed', (e) => {
          console.error('JsSIP Registration failed:', e.cause);
          showToast('error', 'SIP Registration Failed: ' + e.cause);
          updateHomeConnection(false);
          updateChatConnection(false);
      });

      state.ua.on('unregistered', () => {
          console.log('SIP unregistered');
          updateHomeConnection(false);
          updateChatConnection(false);
      });

      state.ua.start();
    } catch (e) {
      console.error('JsSIP Initialization failed:', e.message);
      showToast('error', 'SIP Init Error: ' + e.message);
    }
  }

  // ---------- Chat UI Logic (Static/Placeholder since Socket.IO is removed) ----------
  els.btnTextSupport.addEventListener('click', () => {
    showScreen('screen-chat');
    updateChatConnection(state.ua && state.ua.isRegistered());
  });

  els.btnChatBack.addEventListener('click', () => {
    showScreen('screen-home');
  });

  els.btnSendInitial.addEventListener('click', async () => {
    const message = els.initialMessage.value.trim();
    if (!message) return;
    
    // Placeholder logic for SIP message or just UI feedback
    appendChatMessage({
      sender: 'client',
      text: message,
      timestamp: new Date().toISOString()
    });
    
    els.initialMessage.value = '';
    els.initialMessageArea.classList.add('hidden');
    els.chatInputArea.classList.remove('hidden');
    els.chatStatus.textContent = 'SIP Mode Active';
    
    showToast('info', 'Message UI updated (SIP Mode)');
  });

  function sendChatMessage() {
    const text = els.chatInput.value.trim();
    if (!text) return;

    appendChatMessage({
      sender: 'client',
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

  // ---------- Connection Status UI ----------
  function updateHomeConnection(connected) {
    if (els.homeConnection) {
        els.homeConnection.className = `status-pill ${connected ? 'connected' : 'disconnected'}`;
        els.homeConnection.querySelector('span:last-child').textContent = connected ? 'Ready for Support' : 'SIP Disconnected';
    }
  }

  function updateChatConnection(connected) {
    if (els.chatConnectionDot) {
        els.chatConnectionDot.className = `status-dot-sm ${connected ? 'connected' : 'disconnected'}`;
        els.chatStatus.textContent = connected ? 'Connected via SIP' : 'SIP Offline';
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
