(function () {
  'use strict';
  const API = '/admin/api';
  const COMPANY = { name: 'Kings Aqomplice', address: 'Legal Intelligence Platform · Strategic Legal Counsel' };

  function el(id) { return document.getElementById(id); }

  function loadInvoices() {
    fetch(API + '/invoices')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        const container = el('invoices-list');
        if (!container) return;
        const active = list.filter(function (i) { return i.status === 'active'; });
        container.innerHTML = active.length ? active.map(function (inv) {
          const data = escapeAttr(JSON.stringify({ id: inv.id, clientName: inv.clientName, serviceRendered: inv.serviceRendered, amount: inv.amount }));
          return '<div class="card p-4 flex flex-wrap justify-between items-center gap-4 border-l-4 border-accent"><div class="flex-1 min-w-0"><strong class="text-primary">' + escapeHtml(inv.clientName) + '</strong><p class="text-sm text-secondary mt-1">' + escapeHtml(inv.serviceRendered) + '</p><p class="font-semibold text-primary mt-2">R ' + (inv.amount || 0).toFixed(2) + '</p></div><div class="flex gap-2"><button type="button" class="btn-primary text-sm py-2 px-4 invoice-pdf-btn" data-invoice="' + data + '">Download PDF</button></div></div>';
        }).join('') : '<p class="text-secondary py-8 text-center">No active invoices. Add one using the form.</p>';
        container.querySelectorAll('.invoice-pdf-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            try {
              const d = JSON.parse(this.getAttribute('data-invoice'));
              window.printInvoice(d.id, d.clientName, d.serviceRendered, d.amount);
            } catch (e) { alert('Error'); }
          });
        });
      })
      .catch(function () { if (el('invoices-list')) el('invoices-list').innerHTML = '<p class="text-red-600">Could not load invoices.</p>'; });
  }

  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function escapeAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.printInvoice = function (id, clientName, serviceRendered, amount) {
    const esc = function (s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    const w = window.open('', '_blank');
    const printStyles = 'body{font-family:Georgia,serif;padding:48px;max-width:600px;margin:0 auto;color:#003c45}h1{color:#5C0601;font-size:1.5rem;margin-bottom:4px;border-bottom:3px solid #5C0601;padding-bottom:8px}.meta{color:#666;font-size:0.9rem;margin-bottom:32px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px 8px;text-align:left;border-bottom:1px solid #e5e7eb}th{color:#5C0601;font-weight:600;width:140px}.total{font-size:1.25rem;font-weight:bold;margin-top:32px;color:#5C0601;text-align:right}@media print{body{padding:24px}a{display:none}}';
    w.document.write('<!DOCTYPE html><html><head><title>Invoice - ' + esc(clientName) + '</title><style>' + printStyles + '</style></head><body>');
    w.document.write('<h1>' + COMPANY.name + '</h1><div class="meta">' + COMPANY.address + '</div>');
    w.document.write('<table><tr><th>Client</th><td>' + esc(clientName) + '</td></tr><tr><th>Service Rendered</th><td>' + esc(serviceRendered) + '</td></tr><tr><th>Amount</th><td>R ' + (amount || 0).toFixed(2) + '</td></tr></table>');
    w.document.write('<div class="total">Total: R ' + (amount || 0).toFixed(2) + '</div>');
    w.document.write('<p style="margin-top:48px;font-size:0.85rem;color:#666">Thank you for your business.</p>');
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); w.close(); }, 250);
  };

  function loadClients() {
    fetch(API + '/clients')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        const sel = el('invoice-client-select');
        if (!sel) return;
        const clients = list.filter(function (c) { return c.id && !String(c.id).startsWith('intake-') && !String(c.id).startsWith('consult-'); });
        sel.innerHTML = '<option value="">— Or select from clients —</option>' + clients.map(function (c) {
          return '<option value="' + escapeAttr(c.name) + '">' + escapeHtml(c.name) + '</option>';
        }).join('');
        sel.addEventListener('change', function () {
          const name = this.value;
          if (name) el('invoice-client-name').value = name;
        });
      })
      .catch(function () {});
  }

  function init() {
    loadInvoices();
    loadClients();
    const form = el('add-invoice-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(form);
        fetch(API + '/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: fd.get('clientName') || '',
            serviceRendered: fd.get('serviceRendered') || '',
            amount: parseFloat(fd.get('amount')) || 0
          })
        })
          .then(function () { form.reset(); loadInvoices(); el('invoice-client-select').value = ''; })
          .catch(function () { alert('Failed to add invoice'); });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
