(function(global) {
  'use strict';

  var captchaApiPromise;

  function loadCaptchaApi() {
    if (global.grecaptcha && typeof global.grecaptcha.render === 'function') {
      return Promise.resolve(global.grecaptcha);
    }
    if (captchaApiPromise) return captchaApiPromise;

    captchaApiPromise = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = function() { resolve(global.grecaptcha); };
      script.onerror = function() { reject(new Error('CAPTCHA could not be loaded.')); };
      document.head.appendChild(script);
    });
    return captchaApiPromise;
  }

  function getCaptchaToken(root) {
    if (!root) return Promise.reject(new Error('CAPTCHA placement is unavailable.'));
    var container = root.querySelector('.gamgee-recaptcha');
    if (!container) {
      container = document.createElement('div');
      container.className = 'gamgee-recaptcha';
      container.setAttribute('aria-label', 'Spam protection');
      root.appendChild(container);
    }

    return loadCaptchaApi().then(function(captcha) {
      if (!container.dataset.widgetId) {
        container.dataset.widgetId = String(captcha.render(container, {
          sitekey: global.GAMGEE_CONFIG.recaptchaSiteKey
        }));
      }
      var token = captcha.getResponse(Number(container.dataset.widgetId));
      if (token) return token;
      var error = new Error('Please complete the CAPTCHA before submitting.');
      error.code = 'captcha_required';
      throw error;
    });
  }

  function submit(payload, options) {
    var requestOptions = options || {};
    return getCaptchaToken(requestOptions.captchaRoot).then(function(token) {
      payload.recaptchaToken = token;
      var fetchOptions = {
        method: 'POST',
        body: JSON.stringify(payload)
      };

      if (requestOptions.opaque) {
        fetchOptions.mode = 'no-cors';
      } else {
        fetchOptions.headers = { 'Content-Type': 'text/plain' };
      }

      return fetch(global.GAMGEE_CONFIG.formEndpoint, fetchOptions)
        .then(function(response) {
          return requestOptions.opaque ? null : response.json();
        });
      });
  }

  global.GamgeeForms = Object.freeze({ submit: submit, loadCaptchaApi: loadCaptchaApi });
})(window);
