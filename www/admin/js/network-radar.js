(function () {
  'use strict';
  const API = '/admin/api';

  function el(id) { return document.getElementById(id); }

  function load() {
    fetch(API + '/visits')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        el('visits-day') && (el('visits-day').textContent = d.day || 0);
        el('visits-month') && (el('visits-month').textContent = d.month || 0);
        el('visits-year') && (el('visits-year').textContent = d.year || 0);
      })
      .catch(function () {
        el('visits-day') && (el('visits-day').textContent = '—');
        el('visits-month') && (el('visits-month').textContent = '—');
        el('visits-year') && (el('visits-year').textContent = '—');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
