(function () {
  'use strict';
  const API = '/admin/api';
  let currentId = null;

  function el(id) { return document.getElementById(id); }

  function loadMemos() {
    fetch(API + '/memos')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        const sel = el('memo-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">New document</option>' + list.map(function (m) {
          return '<option value="' + m.id + '">' + (m.title || 'Untitled') + '</option>';
        }).join('');
      })
      .catch(function () {});
  }

  function loadMemo(id) {
    if (!id) { currentId = null; el('memo-editor').value = ''; el('memo-title').value = ''; return; }
    fetch(API + '/memos/' + id)
      .then(function (r) { return r.json(); })
      .then(function (m) {
        currentId = m.id;
        el('memo-title').value = m.title || '';
        el('memo-editor').value = m.content || '';
      })
      .catch(function () { alert('Could not load document'); });
  }

  function save() {
    const title = el('memo-title').value || 'Untitled';
    const content = el('memo-editor').value || '';
    const url = currentId ? API + '/memos/' + currentId : API + '/memos';
    const method = currentId ? 'PATCH' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, content: content })
    })
      .then(function (r) { return r.json(); })
      .then(function (m) {
        currentId = m.id;
        loadMemos();
        alert('Saved');
      })
      .catch(function () { alert('Save failed'); });
  }

  function printPdf() {
    const title = el('memo-title').value || 'Document';
    const content = (el('memo-editor').value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>body{font-family:Georgia,serif;padding:48px;max-width:800px;margin:0 auto;line-height:1.6;color:#003c45}h1{color:#5C0601;font-size:1.5rem;margin-bottom:24px;border-bottom:2px solid #5C0601;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{padding:24px}}</style></head><body>');
    w.document.write('<h1>' + title + '</h1>');
    w.document.write('<pre>' + content + '</pre>');
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); w.close(); }, 250);
  }

  function init() {
    loadMemos();
    el('memo-save') && el('memo-save').addEventListener('click', save);
    el('memo-print') && el('memo-print').addEventListener('click', printPdf);
    el('memo-select') && el('memo-select').addEventListener('change', function () {
      loadMemo(this.value || null);
    });
    el('memo-upload') && el('memo-upload').addEventListener('change', function () {
      const f = this.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () {
        el('memo-editor').value = r.result;
        if (!el('memo-title').value) el('memo-title').value = f.name.replace(/\.[^.]+$/, '') || 'Untitled';
      };
      r.readAsText(f);
      this.value = '';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
