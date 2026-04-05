(function () {
  'use strict';
  const API = '/admin/api';
  let currentDate = new Date();
  let view = 'month';

  function el(id) { return document.getElementById(id); }

  function pad(n) { return n < 10 ? '0' + n : n; }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtTime(t) { if (!t) return ''; const [h, m] = t.split(':'); return (parseInt(h, 10) % 12 || 12) + ':' + (m || '00') + (parseInt(h, 10) >= 12 ? ' PM' : ' AM'); }
  function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function loadEvents(cb) {
    let start, end;
    if (view === 'month') {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    } else if (view === 'week') {
      const d = new Date(currentDate);
      const day = d.getDay();
      start = new Date(d);
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
    }
    fetch(API + '/calendar?start=' + start.toISOString() + '&end=' + end.toISOString())
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () { cb([]); });
  }

  function renderMonth(events) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const days = last.getDate();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const today = new Date();

    let html = '<div class="calendar-header"><div class="calendar-title">' + monthNames[month] + ' ' + year + '</div>';
    html += '<div class="calendar-nav"><button type="button" id="cal-prev">← Prev</button><button type="button" id="cal-next">Next →</button></div></div>';
    html += '<div class="cal-weekday-header">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function (d) { html += '<div>' + d + '</div>'; });
    html += '</div><div class="cal-month-grid">';

    for (var i = 0; i < startPad; i++) {
      const prevMonth = new Date(year, month, -startPad + i + 1);
      html += '<div class="cal-day-cell other-month"><div class="cal-day-num">' + prevMonth.getDate() + '</div><div class="cal-day-events"></div></div>';
    }
    for (var d = 1; d <= days; d++) {
      const dateStr = fmtDate(new Date(year, month, d));
      const dayDate = new Date(year, month, d);
      const isToday = dateStr === fmtDate(today);
      const dayEvents = events.filter(function (e) {
        const ed = new Date(e.startDate);
        return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === d;
      });
      html += '<div class="cal-day-cell' + (isToday ? ' today' : '') + '">';
      html += '<div class="cal-day-num">' + d + '</div>';
      html += '<div class="cal-day-events">';
      dayEvents.slice(0, 3).forEach(function (e) {
        const typeClass = 'cal-event-pill type-' + (e.type || 'event');
        const icon = e.type === 'case' ? '📋 ' : e.type === 'time' ? '⏱ ' : '';
        html += '<div class="' + typeClass + '" title="' + escapeHtml(e.summary || e.title) + '">' + icon + escapeHtml(e.title || 'Event') + '</div>';
      });
      if (dayEvents.length > 3) html += '<div class="cal-event-pill type-event">+' + (dayEvents.length - 3) + ' more</div>';
      html += '</div>';
      html += '<button type="button" class="cal-day-add" onclick="window.openEventModal(\'' + dateStr + '\')">+ Add</button>';
      html += '</div>';
    }
    var remaining = 42 - (startPad + days);
    if (remaining > 0) {
      for (var r = 1; r <= remaining; r++) {
        const nextDate = new Date(year, month + 1, r);
        html += '<div class="cal-day-cell other-month"><div class="cal-day-num">' + nextDate.getDate() + '</div><div class="cal-day-events"></div></div>';
      }
    }
    html += '</div>';
    return html;
  }

  function renderWeek(events) {
    const d = new Date(currentDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let html = '<div class="calendar-header"><div class="calendar-title">Week of ' + monthNames[start.getMonth()] + ' ' + start.getDate() + ', ' + start.getFullYear() + '</div>';
    html += '<div class="calendar-nav"><button type="button" id="cal-prev">← Prev</button><button type="button" id="cal-next">Next →</button></div></div>';
    html += '<div class="cal-week-grid" style="padding: 1rem;">';
    for (var i = 0; i < 7; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      const dateStr = fmtDate(dayDate);
      const dayEvents = events.filter(function (e) {
        const ed = new Date(e.startDate);
        return fmtDate(ed) === dateStr;
      });
      html += '<div class="cal-week-day"><div class="cal-week-day-header">' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayDate.getDay()] + ', ' + monthNames[dayDate.getMonth()] + ' ' + dayDate.getDate() + '</div>';
      html += '<div class="cal-week-events">';
      dayEvents.forEach(function (e) {
        const typeClass = 'cal-week-event type-' + (e.type || 'event');
        html += '<div class="' + typeClass + '"><strong>' + escapeHtml(e.title || 'Event') + '</strong>' + (e.startTime ? ' <span class="text-secondary text-xs">' + fmtTime(e.startTime) + (e.endTime ? '–' + fmtTime(e.endTime) : '') + '</span>' : '') + (e.summary ? '<br><span class="text-secondary text-xs">' + escapeHtml(e.summary) + '</span>' : '') + '</div>';
      });
      html += '</div><button type="button" class="cal-day-add mt-2" onclick="window.openEventModal(\'' + dateStr + '\')">+ Add</button></div>';
    }
    html += '</div>';
    return html;
  }

  function renderDay(events) {
    const d = new Date(currentDate);
    const dateStr = fmtDate(d);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayEvents = events.filter(function (e) { return fmtDate(new Date(e.startDate)) === dateStr; });
    let html = '<div class="calendar-header"><div class="calendar-title">' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + '</div>';
    html += '<div class="calendar-nav"><button type="button" id="cal-prev">← Prev</button><button type="button" id="cal-next">Next →</button></div></div>';
    html += '<div class="cal-day-list" style="padding: 1rem;">';
    dayEvents.forEach(function (e) {
      const badge = (e.type === 'case' || e.type === 'time') ? '<span class="text-xs font-medium px-2 py-0.5 rounded mr-2 ' + (e.type === 'case' ? 'bg-accent/15 text-accent' : 'bg-green-100 text-green-800') + '">' + (e.type === 'case' ? 'Case' : 'Time') + '</span>' : '';
      html += '<div class="cal-day-event-card">' + badge + '<h3 class="font-semibold text-primary inline">' + escapeHtml(e.title || 'Event') + '</h3>' + (e.startTime || e.endTime ? '<p class="text-sm text-secondary mt-1">' + fmtTime(e.startTime) + (e.endTime ? ' – ' + fmtTime(e.endTime) : '') + '</p>' : '') + (e.summary ? '<p class="mt-2 text-secondary text-sm">' + escapeHtml(e.summary) + '</p>' : '') + '<button type="button" class="text-xs text-red-600 mt-2 hover:underline" onclick="window.deleteEvent(\'' + e.id + '\')">Delete</button></div>';
    });
    html += '<button type="button" class="btn-accent mt-4" onclick="window.openEventModal(\'' + dateStr + '\')">+ Add event</button></div>';
    return html;
  }

  function refresh() {
    loadEvents(function (events) {
      const container = el('calendar-container');
      if (!container) return;
      if (view === 'month') container.innerHTML = renderMonth(events);
      else if (view === 'week') container.innerHTML = renderWeek(events);
      else container.innerHTML = renderDay(events);
      el('cal-prev') && el('cal-prev').addEventListener('click', function () {
        if (view === 'month') currentDate.setMonth(currentDate.getMonth() - 1);
        else if (view === 'week') currentDate.setDate(currentDate.getDate() - 7);
        else currentDate.setDate(currentDate.getDate() - 1);
        refresh();
      });
      el('cal-next') && el('cal-next').addEventListener('click', function () {
        if (view === 'month') currentDate.setMonth(currentDate.getMonth() + 1);
        else if (view === 'week') currentDate.setDate(currentDate.getDate() + 7);
        else currentDate.setDate(currentDate.getDate() + 1);
        refresh();
      });
    });
  }

  window.openEventModal = function (defaultDate) {
    const modal = el('event-modal');
    const form = el('event-form');
    if (modal && form) {
      form.reset();
      el('event-start-date').value = defaultDate || fmtDate(new Date());
      el('event-end-date').value = defaultDate || fmtDate(new Date());
      modal.classList.remove('hidden');
    }
  };

  window.closeEventModal = function () {
    const modal = el('event-modal');
    if (modal) modal.classList.add('hidden');
  };

  window.deleteEvent = function (id) {
    if (!confirm('Delete this event?')) return;
    fetch(API + '/calendar/' + id, { method: 'DELETE' }).then(refresh);
  };

  function init() {
    refresh();
    const form = el('event-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(form);
        fetch(API + '/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fd.get('title') || 'Untitled',
            startDate: fd.get('startDate') + 'T00:00:00',
            endDate: fd.get('endDate') + 'T23:59:59',
            startTime: fd.get('startTime') || null,
            endTime: fd.get('endTime') || null,
            summary: fd.get('summary') || null,
            type: fd.get('type') || 'event'
          })
        })
          .then(function () { window.closeEventModal(); refresh(); form.reset(); })
          .catch(function () { alert('Failed to add event'); });
      });
    }
    function updateViewButtons() {
      ['month','week','day'].forEach(function (v) {
        const btn = el('cal-view-' + v);
        if (btn) {
          btn.classList.toggle('btn-view-active', view === v);
          btn.classList.remove('btn-primary', 'btn-accent');
        }
      });
    }
    ['month','week','day'].forEach(function (v) {
      const btn = el('cal-view-' + v);
      if (btn) btn.addEventListener('click', function () { view = v; updateViewButtons(); refresh(); });
    });
    updateViewButtons();
    const addBtn = el('cal-add-event');
    if (addBtn) addBtn.addEventListener('click', function () { window.openEventModal(fmtDate(currentDate)); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
