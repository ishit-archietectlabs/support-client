// =============================================================
// Support Client — Client App
// Two-button support: Text chat via Socket.IO, Voice via JsSIP
// =============================================================

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    config: {},
    socket: null,
    requestId: null,
    ua: null,
    currentSession: null,
    isMuted: false,
    callTimer: null,
    callSeconds: 0
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);

  const els = {
    // Screens
    screenHome: $('#screen-home'),
    screenChat: $('#screen-chat'),
    screenCall: $('#screen-call'),
    // Home
    siteNameLabel: $('#site-name-label'),
    btnTextSupport: $('#btn-text-support'),
    btnCallSupport: $('#btn-call-support'),
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
    // Call
    btnCallBack: $('#btn-call-back'),
    callSipStatus: $('#call-sip-status'),
    callDialing: $('#call-dialing'),
    callActive: $('#call-active'),
    callEnded: $('#call-ended'),
    btnCancelCall: $('#btn-cancel-call'),
    callTimerEl: $('#call-timer'),
    btnCallMute: $('#btn-call-mute'),
    btnCallHangup: $('#btn-call-hangup'),
    btnCallSpeaker: $('#btn-call-speaker'),
    callDurationFinal: $('#call-duration-final'),
    btnCallRetry: $('#btn-call-retry'),
    btnCallHome: $('#btn-call-home'),
    remoteAudio: $('#remote-audio'),
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
      const res = await fetch('/api/config');
      state.config = await res.json();
      els.siteNameLabel.textContent = state.config.site_name || 'Remote Site';
    } catch (e) {
      console.error('Failed to load config:', e);
      showToast('error', 'Failed to load configuration');
    }
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
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    state.socket.on('connect', () => {
      console.log('[SOCKET] Connected to central');
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

    state.socket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err.message);
      updateHomeConnection(false);
      updateChatConnection(false);
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
          message: message,
          sip_extension: state.config.sip_extension
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

  // ---------- CALL SUPPORT ----------
  els.btnCallSupport.addEventListener('click', async () => {
    showScreen('screen-call');
    showCallState('dialing');

    // Create a call request on central
    try {
      const centralUrl = state.config.central_url || 'http://localhost:3000';
      const res = await fetch(`${centralUrl}/api/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: state.config.site_name,
          type: 'call',
          message: 'Voice call request',
          sip_extension: state.config.sip_extension,
          caller_id: state.config.site_name
        })
      });

      const data = await res.json();
      state.requestId = data.request_id;

      connectSocket(() => {
        if (state.socket) {
          state.socket.emit('call-initiated', {
            request_id: state.requestId,
            site_name: state.config.site_name,
            sip_extension: state.config.sip_extension,
            caller_id: state.config.site_name
          });
        }
      });

    } catch (e) {
      console.error('Failed to create call request:', e);
    }

    // Initiate SIP call via JsSIP
    initSIPAndCall();
  });

  function initSIPAndCall() {
    const { asterisk_ws_url, sip_extension, sip_password, sip_domain } = state.config;

    if (!asterisk_ws_url || !sip_extension) {
      showToast('error', 'SIP configuration missing');
      showCallState('ended');
      return;
    }

    try {
      const socketJsSIP = new JsSIP.WebSocketInterface(asterisk_ws_url);

      const configuration = {
        sockets: [socketJsSIP],
        uri: `sip:${sip_extension}@${sip_domain}`,
        password: sip_password,
        display_name: state.config.site_name || 'Support Client',
        register: true,
        session_timers: false
      };

      state.ua = new JsSIP.UA(configuration);

      els.callSipStatus.textContent = 'Connecting to server…';

      state.ua.on('registered', () => {
        els.callSipStatus.textContent = 'Registered — Calling agent…';
        makeCall();
      });

      state.ua.on('registrationFailed', (e) => {
        els.callSipStatus.textContent = 'Registration failed';
        showToast('error', 'SIP registration failed: ' + (e.cause || 'unknown'));
        setTimeout(() => showCallState('ended'), 2000);
      });

      state.ua.on('connected', () => {
        console.log('[SIP] WebSocket connected');
      });

      state.ua.on('disconnected', () => {
        console.log('[SIP] WebSocket disconnected');
      });

      state.ua.start();

    } catch (e) {
      console.error('[SIP] Init error:', e);
      showToast('error', 'SIP initialization failed');
      showCallState('ended');
    }
  }

  function makeCall() {
    const { sip_domain } = state.config;
    const target = `sip:100@${sip_domain}`;

    const options = {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    };

    const session = state.ua.call(target, options);
    state.currentSession = session;

    session.on('progress', () => {
      els.callSipStatus.textContent = 'Ringing…';
    });

    session.on('confirmed', () => {
      els.callSipStatus.textContent = 'Connected';
      showCallState('active');
      startCallTimer();
    });

    session.on('ended', () => {
      endCall();
    });

    session.on('failed', (e) => {
      console.error('[SIP] Call failed:', e.cause);
      showToast('error', 'Call failed: ' + (e.cause || 'unknown'));
      endCall();
    });

    session.on('peerconnection', (e) => {
      const pc = e.peerconnection;
      pc.ontrack = (event) => {
        if (event.track.kind === 'audio') {
          const stream = new MediaStream([event.track]);
          els.remoteAudio.srcObject = stream;
          els.remoteAudio.play().catch(() => {});
        }
      };
    });
  }

  // Call State UI
  function showCallState(stateStr) {
    els.callDialing.classList.add('hidden');
    els.callActive.classList.add('hidden');
    els.callEnded.classList.add('hidden');

    switch (stateStr) {
      case 'dialing':
        els.callDialing.classList.remove('hidden');
        break;
      case 'active':
        els.callActive.classList.remove('hidden');
        break;
      case 'ended':
        els.callEnded.classList.remove('hidden');
        const m = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
        const s = (state.callSeconds % 60).toString().padStart(2, '0');
        els.callDurationFinal.textContent = `Duration: ${m}:${s}`;
        break;
    }
  }

  function endCall() {
    state.currentSession = null;
    state.isMuted = false;
    stopCallTimer();
    showCallState('ended');
    els.callSipStatus.textContent = 'Call ended';

    if (els.remoteAudio.srcObject) {
      els.remoteAudio.srcObject = null;
    }

    if (state.ua) {
      try { state.ua.stop(); } catch (e) {}
      state.ua = null;
    }
  }

  // Call Controls
  els.btnCancelCall.addEventListener('click', () => {
    if (state.currentSession) {
      try { state.currentSession.terminate(); } catch (e) {}
    }
    endCall();
  });

  els.btnCallHangup.addEventListener('click', () => {
    if (state.currentSession) {
      try { state.currentSession.terminate(); } catch (e) {}
    }
    endCall();
  });

  els.btnCallMute.addEventListener('click', () => {
    if (!state.currentSession) return;
    state.isMuted = !state.isMuted;

    if (state.isMuted) {
      state.currentSession.mute({ audio: true });
    } else {
      state.currentSession.unmute({ audio: true });
    }

    els.btnCallMute.classList.toggle('muted', state.isMuted);
    els.btnCallMute.querySelector('.material-icons-round').textContent = state.isMuted ? 'mic_off' : 'mic';
    els.btnCallMute.querySelector('.action-label').textContent = state.isMuted ? 'Unmute' : 'Mute';
  });

  els.btnCallBack.addEventListener('click', () => {
    if (state.currentSession) {
      try { state.currentSession.terminate(); } catch (e) {}
    }
    endCall();
    showScreen('screen-home');
  });

  els.btnCallRetry.addEventListener('click', () => {
    state.callSeconds = 0;
    showCallState('dialing');
    initSIPAndCall();
  });

  els.btnCallHome.addEventListener('click', () => {
    showScreen('screen-home');
  });

  // Call Timer
  function startCallTimer() {
    state.callSeconds = 0;
    els.callTimerEl.textContent = '00:00';
    state.callTimer = setInterval(() => {
      state.callSeconds++;
      const m = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
      const s = (state.callSeconds % 60).toString().padStart(2, '0');
      els.callTimerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopCallTimer() {
    if (state.callTimer) {
      clearInterval(state.callTimer);
      state.callTimer = null;
    }
  }

  // ---------- Connection Status ----------
  function updateHomeConnection(connected) {
    els.homeConnection.className = `status-pill ${connected ? 'connected' : 'disconnected'}`;
    els.homeConnection.querySelector('span:last-child').textContent = connected ? 'Connected to Support' : 'Connecting…';
  }

  function updateChatConnection(connected) {
    els.chatConnectionDot.className = `status-dot-sm ${connected ? 'connected' : 'disconnected'}`;
    if (connected && !state.requestId) {
      els.chatStatus.textContent = 'Connected — Type your message below';
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
