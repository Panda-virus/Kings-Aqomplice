/**
 * Kings Aqomplice — Legal Intelligence Chat
 * Rebuilt for reliability: bubble, panel, messages, quick actions
 */
(function () {
  'use strict';

  const CHAT_API = '/api/chat';
  const QUICK_ACTIONS = [
    { label: 'Ask a question', value: 'What services does Kings Aqomplice offer?' },
    { label: 'Start intake', value: 'intake' },
    { label: 'Book consultation', value: 'consultation' },
  ];

  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    var match = document.cookie.match(/ka_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function appendMessage(container, role, content) {
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'chat-message ' + (role === 'user' ? 'text-right' : 'text-left');
    var bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'inline-block bg-primary text-white px-4 py-2.5 text-sm max-w-[85%] rounded-2xl rounded-br-md'
      : 'inline-block bg-gray-50 text-secondary px-4 py-2.5 text-sm max-w-[85%] rounded-2xl rounded-bl-md';
    if (role === 'assistant') bubble.style.borderLeft = '3px solid rgba(0,60,69,0.2)';
    bubble.textContent = content;
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping(container) {
    if (!container) return;
    var div = document.createElement('div');
    div.id = 'chat-typing';
    div.className = 'chat-typing-indicator text-left';
    div.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  function renderQuickActions(container, show) {
    if (!container) return;
    container.innerHTML = '';
    if (!show) return;
    QUICK_ACTIONS.forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-quick-action';
      btn.textContent = a.label;
      btn.addEventListener('click', function () {
        var form = document.getElementById('chat-form');
        var input = document.getElementById('chat-input');
        if (input && form) {
          input.value = a.value;
          container.innerHTML = '';
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
      container.appendChild(btn);
    });
  }

  function openPanel(panel, toggle, showQA) {
    if (!panel || !toggle) return;
    var overlay = document.getElementById('chat-overlay');
    if (overlay) overlay.classList.add('chat-panel-open');
    toggle.setAttribute('aria-expanded', 'true');
    var iconOpen = document.getElementById('chat-icon-open');
    var iconClose = document.getElementById('chat-icon-close');
    if (iconOpen) iconOpen.classList.add('hidden');
    if (iconClose) iconClose.classList.remove('hidden');
    if (window.matchMedia('(max-width: 767px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    if (showQA) {
      var qa = document.getElementById('chat-quick-actions');
      renderQuickActions(qa, true);
    }
  }

  function closePanel(panel, toggle) {
    if (!panel || !toggle) return;
    var overlay = document.getElementById('chat-overlay');
    if (overlay) overlay.classList.remove('chat-panel-open');
    toggle.setAttribute('aria-expanded', 'false');
    var iconOpen = document.getElementById('chat-icon-open');
    var iconClose = document.getElementById('chat-icon-close');
    if (iconOpen) iconOpen.classList.remove('hidden');
    if (iconClose) iconClose.classList.add('hidden');
    if (window.matchMedia('(max-width: 767px)').matches) {
      document.body.style.overflow = '';
    }
    var qa = document.getElementById('chat-quick-actions');
    renderQuickActions(qa, false);
  }

  window.KAChat = {
    openPanel: openPanel,
    closePanel: closePanel,
    isOpen: function (panel) {
      var overlay = document.getElementById('chat-overlay');
      return overlay && overlay.classList.contains('chat-panel-open');
    }
  };

  function init() {
    var toggle = document.getElementById('chat-toggle');
    var panel = document.getElementById('chat-panel');
    var form = document.getElementById('chat-form');
    var input = document.getElementById('chat-input');
    var messages = document.getElementById('chat-messages');
    var quickActions = document.getElementById('chat-quick-actions');
    var fileInput = document.getElementById('chat-file');
    var fileBtn = document.getElementById('chat-file-btn');
    var filePreview = document.getElementById('chat-file-preview');

    if (!toggle || !panel || !form || !input || !messages || !quickActions) return;

    if (messages.children.length === 0) {
      appendMessage(messages, 'assistant',
        'Welcome to Kings Aqomplice Legal Intelligence. Ask a question, say "intake" to begin case intake, or "consultation" to request a meeting. How may I assist?');
    }
    renderQuickActions(quickActions, true);

    toggle.addEventListener('click', function () {
      if (window.KAChat.isOpen(panel)) {
        closePanel(panel, toggle);
      } else {
        openPanel(panel, toggle, true);
        input.focus();
      }
    });

    var closeBtn = document.getElementById('chat-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { closePanel(panel, toggle); });
    }
    var backdrop = document.getElementById('chat-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function () { closePanel(panel, toggle); });
    }

    if (fileBtn && fileInput) {
      fileBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (filePreview) {
          if (fileInput.files.length) {
            filePreview.textContent = fileInput.files[0].name + ' (' + (fileInput.files[0].size / 1024).toFixed(1) + ' KB)';
            filePreview.classList.remove('hidden');
          } else {
            filePreview.textContent = '';
            filePreview.classList.add('hidden');
          }
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (input.value || '').trim();
      var file = fileInput && fileInput.files && fileInput.files[0];
      if (!text && !file) return;

      renderQuickActions(quickActions, false);

      var displayText = file ? (text ? text + ' [Attached: ' + file.name + ']' : '[Attached: ' + file.name + ']') : text;
      appendMessage(messages, 'user', displayText);
      input.value = '';
      if (fileInput) fileInput.value = '';
      if (filePreview) { filePreview.textContent = ''; filePreview.classList.add('hidden'); }

      input.disabled = true;
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (fileBtn) fileBtn.disabled = true;

      showTyping(messages);

      var token = getCsrfToken();
      var headers = {};
      if (token) headers['X-CSRF-Token'] = token;

      var body;
      if (file) {
        body = new FormData();
        body.append('message', text);
        body.append('file', file);
        if (token) body.append('_csrf', token);
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ message: text });
      }

      fetch(CHAT_API, {
        method: 'POST',
        headers: headers,
        credentials: 'same-origin',
        body: body
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          hideTyping();
          if (result.ok) {
            appendMessage(messages, 'assistant', result.data.message || 'No response.');
            if (result.data.nextStep && result.data.branch === 'intake') {
              input.placeholder = 'Continue intake...';
            }
          } else {
            appendMessage(messages, 'assistant', result.data.error || 'An error occurred. Please try again.');
          }
        })
        .catch(function () {
          hideTyping();
          appendMessage(messages, 'assistant', 'Unable to connect. Please ensure the server is running and try again.');
        })
        .finally(function () {
          input.disabled = false;
          if (submitBtn) submitBtn.disabled = false;
          if (fileBtn) fileBtn.disabled = false;
          input.focus();
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
