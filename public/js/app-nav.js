/**
 * Kings Aqomplice — Mobile app navigation
 * Bottom nav bar, active state, Intelligence → chat integration
 */
(function () {
  'use strict';

  function setActiveNav() {
    const path = window.location.pathname || '/';
    const items = document.querySelectorAll('.app-nav-item[data-href]');
    items.forEach((el) => {
      const href = el.getAttribute('data-href');
      const isActive = href === '/' ? path === '/' || path === '/index.html' : path.includes(href);
      el.setAttribute('aria-current', isActive ? 'page' : null);
      el.classList.toggle('active', isActive);
    });
  }

  function openChatFromTrigger(e) {
    const chatToggle = document.getElementById('chat-toggle');
    const chatPanel = document.getElementById('chat-panel');
    if (!chatPanel || !chatToggle) return;
    e.preventDefault();
    if (window.KAChat && !window.KAChat.isOpen(chatPanel)) {
      window.KAChat.openPanel(chatPanel, chatToggle, true);
      const input = document.getElementById('chat-input');
      if (input) input.focus();
    }
  }

  function initChatTriggers() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatPanel = document.getElementById('chat-panel');
    if (!chatPanel || !chatToggle) return;

    document.querySelectorAll('.chat-trigger, .chat-trigger-btn').forEach(function (el) {
      el.addEventListener('click', openChatFromTrigger);
    });
  }

  function closeChatOnMobile() {
    const chatPanel = document.getElementById('chat-panel');
    const chatToggle = document.getElementById('chat-toggle');
    if (!chatPanel) return;

    const close = () => {
      if (window.matchMedia('(max-width: 767px)').matches && window.KAChat) {
        window.KAChat.closePanel(chatPanel, chatToggle || { setAttribute: function(){} });
      }
    };

    const closeBtn = document.getElementById('chat-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    chatPanel.addEventListener('click', function (e) {
      if (e.target === chatPanel && window.matchMedia('(max-width: 767px)').matches) close();
    });
  }

  function init() {
    setActiveNav();
    initChatTriggers();
    closeChatOnMobile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
