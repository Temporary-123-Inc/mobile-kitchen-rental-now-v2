(() => {
  const messageForError = 'We could not send your request. Please try again or call (833) 634-7812.';

  const enableForm = (form) => {
    if (form.dataset.glideContactReady === 'true') return;
    form.dataset.glideContactReady = 'true';
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = false;
    const intro = form.querySelector('.form-intro');
    if (intro) intro.textContent = 'Complete the project brief and we’ll send it securely to the project team.';
  };

  const enableForms = (root = document) => {
    if (root.matches?.('form.quote-form')) enableForm(root);
    root.querySelectorAll?.('form.quote-form').forEach(enableForm);
  };

  const setStatus = (form, text, state) => {
    const status = form.querySelector('.form-status');
    if (!status) return;
    status.textContent = text;
    status.className = `form-status ${state}`;
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest?.('form.quote-form');
    if (!form || form.id === 'rental-calculator-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, 'Please complete every required field.', 'error');
      return;
    }

    const formData = new FormData(form);
    if (formData.get('website')) {
      form.reset();
      setStatus(form, 'Thank you. Your request has been received.', 'success');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus(form, 'Sending your project request…', 'loading');

    const data = {
      url: window.location.href,
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      message: String(formData.get('message') || ''),
      service: String(formData.get('service') || ''),
      duration: String(formData.get('duration') || ''),
      industry: String(formData.get('industry') || ''),
      location: String(formData.get('location') || ''),
      startDate: String(formData.get('startDate') || ''),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') || ''),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || messageForError);
      form.reset();
      setStatus(form, 'Thank you. Your project request was sent successfully.', 'success');
    } catch (error) {
      setStatus(form, error.message || messageForError, 'error');
    } finally {
      form.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enableForms());
  else enableForms();
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) enableForms(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
