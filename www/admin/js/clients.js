(function () {
  'use strict';
  const API = '/admin/api';

  function el(id) { return document.getElementById(id); }

  function renderClient(c) {
    const isSignup = c.isSignup === true || (c.id && (String(c.id).startsWith('intake-') || String(c.id).startsWith('consult-')));
    const sourceBadge = c.source ? '<span class="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">' + escapeHtml(c.source) + '</span>' : '';
    const prog = Math.min(100, Math.max(0, c.progress || 0));
    const progressCircle = !isSignup ? `
            <div class="relative inline-block w-16 h-16">
              <svg viewBox="0 0 36 36" class="w-16 h-16 -rotate-90">
                <path class="text-gray-200" stroke="currentColor" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="text-primary" stroke="currentColor" stroke-width="3" stroke-dasharray="${prog}, 100" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">${prog}%</span>
            </div>
            <input type="range" min="0" max="100" value="${prog}" class="mt-1 w-24 block mx-auto" data-id="${c.id}" onchange="window.updateProgress('${c.id}', this.value)">
          ` : '<span class="text-xs px-2 py-1 rounded bg-accent/15 text-accent font-medium">Sign-up</span>';
    const actions = !isSignup
      ? '<button type="button" class="text-xs text-accent hover:text-primary" onclick="window.deleteClient(\'' + c.id + '\')">Delete</button>'
      : '<button type="button" class="text-xs btn-primary py-1 px-2 add-signup-btn" data-signup="' + escapeAttr(JSON.stringify({ id: c.id, name: c.name, email: c.email, phone: c.phone, caseName: c.caseName, caseSummary: c.caseSummary })) + '">Add to clients</button>';
    return `
      <div class="card p-4">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-primary">${escapeHtml(c.name)}</h3>
              ${sourceBadge}
            </div>
            ${c.email ? `<p class="text-sm text-secondary">${escapeHtml(c.email)}</p>` : ''}
            ${c.caseName ? `<p class="text-sm mt-1"><strong>Case:</strong> ${escapeHtml(c.caseName)}</p>` : ''}
            ${c.caseSummary ? `<p class="text-sm text-secondary mt-1">${escapeHtml((c.caseSummary || '').slice(0, 100))}${(c.caseSummary || '').length > 100 ? '…' : ''}</p>` : ''}
            ${c.assignedTo ? `<p class="text-xs mt-1 text-secondary">Assigned: ${escapeHtml(c.assignedTo)}</p>` : ''}
          </div>
          <div class="shrink-0 text-center">
            ${progressCircle}
          </div>
        </div>
        ${actions ? '<div class="mt-3 flex gap-2">' + actions + '</div>' : ''}
      </div>
    `;
  }

  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function escapeAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.addSignupAsClient = function (data) {
    fetch(API + '/clients/from-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function () { loadClients(); })
        .catch(function () { alert('Failed to add client'); });
  };

  window.updateProgress = function (id, val) {
    fetch(API + '/clients/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: parseInt(val, 10) })
    }).then(function () { loadClients(); });
  };

  window.deleteClient = function (id) {
    if (!confirm('Delete this client?')) return;
    fetch(API + '/clients/' + id, { method: 'DELETE' })
      .then(function () { loadClients(); });
  };

  function loadClients() {
    fetch(API + '/clients?combined=1')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        const container = el('clients-list');
        if (!container) return;
        container.innerHTML = list.length ? list.map(renderClient).join('') : '<p class="text-secondary">No clients yet. Add one or import from intakes.</p>';
        container.querySelectorAll('.add-signup-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            try {
              const d = JSON.parse(this.getAttribute('data-signup'));
              window.addSignupAsClient(d);
            } catch (e) { alert('Error'); }
          });
        });
      })
      .catch(function () { if (el('clients-list')) el('clients-list').innerHTML = '<p class="text-red-600">Could not load clients.</p>'; });
  }

  function init() {
    loadClients();
    const form = el('add-client-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(form);
        fetch(API + '/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fd.get('name') || '',
            email: fd.get('email') || '',
            phone: fd.get('phone') || '',
            caseName: fd.get('caseName') || '',
            caseSummary: fd.get('caseSummary') || '',
            assignedTo: fd.get('assignedTo') || '',
            progress: parseInt(fd.get('progress'), 10) || 0
          })
        })
          .then(function () { form.reset(); loadClients(); })
          .catch(function () { alert('Failed to add client'); });
      });
    }
    const importIntakes = el('import-intakes');
    if (importIntakes) {
      importIntakes.addEventListener('click', function () {
        importIntakes.disabled = true;
        fetch(API + '/clients/import-intakes', { method: 'POST' })
          .then(function (r) { return r.json(); })
          .then(function (d) { alert('Imported ' + d.imported + ' clients from Case Intakes'); loadClients(); })
          .catch(function () { alert('Import failed'); })
          .finally(function () { importIntakes.disabled = false; });
      });
    }
    const importConsult = el('import-consultations');
    if (importConsult) {
      importConsult.addEventListener('click', function () {
        importConsult.disabled = true;
        fetch(API + '/clients/import-consultations', { method: 'POST' })
          .then(function (r) { return r.json(); })
          .then(function (d) { alert('Imported ' + d.imported + ' clients from Consultations'); loadClients(); })
          .catch(function () { alert('Import failed'); })
          .finally(function () { importConsult.disabled = false; });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
