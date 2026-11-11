(function(global, document) {
  'use strict';

  var form = document.getElementById('partnershipForm');
  if (!form) return;

  var fieldNames = ['firstName', 'lastName', 'organisation', 'email', 'phone', 'role', 'location', 'message'];
  var requiredFields = ['firstName', 'lastName', 'organisation', 'email', 'role', 'message'];
  var feedback = form.querySelector('[data-form-feedback]');
  var submitButton = form.querySelector('button[type="submit"]');
  var success = document.getElementById('partnershipSuccess');
  var captchaPromise = null;
  var submitting = false;
  var accepted = false;
  var captchaMessage = 'The security check could not load. Try again by focusing a form field or submitting your inquiry.';

  // Validate trimmed answers before sending the existing homepage Partners payload.
  form.noValidate = true;
  fieldNames.forEach(function(name) {
    var field = form.elements.namedItem(name);
    if (!field) return;
    field.required = requiredFields.indexOf(name) !== -1;
    if ('maxLength' in field) field.maxLength = name === 'message' ? 6000 : 250;
    field.addEventListener('input', function() { field.setCustomValidity(''); });
    field.addEventListener('change', function() { field.setCustomValidity(''); });
  });

  function failure(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function helper() {
    var forms = global.GamgeeForms;
    if (!forms || typeof forms.submit !== 'function' || typeof forms.loadCaptchaApi !== 'function') {
      throw failure('configuration', 'Please refresh this page to load the updated form.');
    }
    return forms;
  }

  function showError(error, moveFocus) {
    if (!feedback) return;
    feedback.textContent = error && error.message || 'Please check your details and try again.';
    if (moveFocus) feedback.focus();
  }

  function prepareCaptcha() {
    if (captchaPromise) return captchaPromise;
    captchaPromise = Promise.resolve().then(function() {
      return helper().loadCaptchaApi();
    }).then(function(captcha) {
      var container = form.querySelector('.gamgee-recaptcha');
      var config = global.GAMGEE_CONFIG;
      if (!container || !config || !config.recaptchaSiteKey) {
        throw failure('configuration', 'Please refresh this page to load the security check.');
      }
      if (!container.dataset.widgetId) {
        container.dataset.widgetId = String(captcha.render(container, {
          sitekey: config.recaptchaSiteKey,
          size: 'compact'
        }));
      }
      if (feedback && feedback.textContent === captchaMessage) feedback.textContent = '';
      return Number(container.dataset.widgetId);
    }).catch(function(error) {
      captchaPromise = null;
      throw error;
    });
    return captchaPromise;
  }

  function prepareOnApproach() {
    if (accepted) return;
    prepareCaptcha().catch(function() {
      if (!submitting) showError(failure('captcha_unavailable', captchaMessage), false);
    });
  }

  form.addEventListener('focusin', prepareOnApproach);
  if ('IntersectionObserver' in global) {
    var observer = new global.IntersectionObserver(function(entries) {
      if (!entries.some(function(entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      prepareOnApproach();
    }, { rootMargin: '200px 0px' });
    observer.observe(form);
  }

  function readPayload() {
    var payload = { _sheet: 'Partners' };
    fieldNames.forEach(function(name) {
      var field = form.elements.namedItem(name);
      if (!field) throw failure('configuration', 'Please refresh this page to load the complete form.');
      var value = field.value.trim();
      var limit = name === 'message' ? 6000 : 250;
      field.value = value;
      field.setCustomValidity(value.length > limit ? 'Please use ' + limit + ' characters or fewer.' : '');
      payload[name] = value;
    });
    return payload;
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (submitting || accepted) return;
    if (feedback) feedback.textContent = '';

    var forms, payload;
    try {
      forms = helper();
      if (!feedback || !submitButton || !success || !success.querySelector('[data-partner-success-title]') || !success.querySelector('[data-partner-success-copy]')) {
        throw failure('configuration', 'Please refresh this page to load the complete form.');
      }
      payload = readPayload();
      if (!form.reportValidity()) return;
    } catch (error) {
      showError(error, true);
      return;
    }

    submitting = true;
    var answerControls = fieldNames.map(function(name) { return form.elements.namedItem(name); });
    var answerDisabled = answerControls.map(function(field) {
      var wasDisabled = field.disabled;
      field.disabled = true;
      return wasDisabled;
    });
    var buttonMarkup = submitButton.innerHTML;
    var buttonDisabled = submitButton.disabled;
    var widgetId = null;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    form.setAttribute('aria-busy', 'true');

    try {
      widgetId = await prepareCaptcha();
      // The shared helper reuses the compact widget through data-widget-id,
      // adds its token, and posts the same JSON contract as the homepage form.
      var result = await forms.submit(payload, { captchaRoot: form });
      if (result && result.error) {
        var serverMessage = typeof result.error === 'string' ? result.error : 'Your inquiry could not be accepted. Please try again.';
        throw failure('rejected', serverMessage);
      }
      if (!result || Array.isArray(result) || result.status !== 'ok') {
        throw failure('unconfirmed', 'We could not confirm receipt. Your details are still here. Please contact partners@gamgee.io before submitting again.');
      }
      success.querySelector('[data-partner-success-title]').textContent = 'Inquiry received';
      success.querySelector('[data-partner-success-copy]').textContent = 'Thank you for reaching out. Our team will review your inquiry and get in touch.';
      var receipt = success.querySelector('[data-partner-receipt]');
      if (receipt) {
        receipt.textContent = '';
        receipt.hidden = true;
      }
      accepted = true;
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      if (error && error.code === 'captcha_required') {
        showError(failure('captcha_required', 'Please complete the security check to send your inquiry.'), true);
      } else if (error && ['configuration', 'rejected', 'unconfirmed'].indexOf(error.code) !== -1) {
        showError(error, true);
      } else {
        showError(failure('unconfirmed', 'We could not confirm receipt. Your details are still here. Please contact partners@gamgee.io before submitting again.'), true);
      }
    } finally {
      if (widgetId !== null && global.grecaptcha && typeof global.grecaptcha.reset === 'function') {
        try { global.grecaptcha.reset(widgetId); } catch (_) {}
      }
      submitting = false;
      form.setAttribute('aria-busy', 'false');
      answerControls.forEach(function(field, index) { field.disabled = answerDisabled[index]; });
      submitButton.disabled = buttonDisabled;
      submitButton.innerHTML = buttonMarkup;
    }
  });
})(window, document);
