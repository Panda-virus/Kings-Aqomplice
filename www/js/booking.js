/**
 * Kings Aqomplice — Consultation & Contact Form Handling
 * Progressive enhancement: forms work without JS (POST), JS adds validation + feedback
 */

(function () {
  'use strict';

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const match = document.cookie.match(/ka_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function showFeedback(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.className = 'mt-4 text-sm ' + (isError ? 'text-red-600' : 'text-secondary');
    el.classList.remove('hidden');
  }

  function initConsultationForm() {
    const form = document.getElementById('consultation-form');
    const feedback = document.getElementById('form-feedback');
    if (!form || !feedback) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById('consultation-submit');
      const origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const headers = { 'Content-Type': 'application/json' };
      const token = getCsrfToken();
      if (token) headers['X-CSRF-Token'] = token;

      try {
        const res = await fetch('/api/booking', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
          showFeedback(feedback, 'Your consultation request has been submitted. We will respond within 2 business days.', false);
          form.reset();
        } else {
          showFeedback(feedback, result.error || 'Submission failed. Please try again.', true);
        }
      } catch (err) {
        showFeedback(feedback, 'Unable to submit. Please try again or use the form without JavaScript.', true);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      }
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const feedback = document.getElementById('contact-feedback');
    if (!form || !feedback) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById('contact-submit');
      const origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const headers = { 'Content-Type': 'application/json' };
      const token = getCsrfToken();
      if (token) headers['X-CSRF-Token'] = token;

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
          showFeedback(feedback, 'Your inquiry has been sent. We will respond within 2 business days.', false);
          form.reset();
        } else {
          showFeedback(feedback, result.error || 'Submission failed. Please try again.', true);
        }
      } catch (err) {
        showFeedback(feedback, 'Unable to submit. Please try again or use the form without JavaScript.', true);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      }
    });
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const submitted = params.get('submitted');
    const error = params.get('error');
    if (submitted === 'consultation') {
      showFeedback(document.getElementById('form-feedback'), 'Your consultation request has been submitted. We will respond within 2 business days.', false);
      window.history.replaceState({}, '', '/contact.html');
    }
    if (submitted === 'inquiry') {
      showFeedback(document.getElementById('contact-feedback'), 'Your inquiry has been sent. We will respond within 2 business days.', false);
      window.history.replaceState({}, '', '/contact.html');
    }
    if (error) {
      const msg = error === 'invalid' ? 'Invalid form data. Please check your inputs.' : 'An error occurred. Please try again.';
      showFeedback(document.getElementById('form-feedback'), msg, true);
      window.history.replaceState({}, '', '/contact.html');
    }
    initConsultationForm();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
