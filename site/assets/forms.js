(function(global) {
  'use strict';

  var captchaApiPromise;

  function captchaIsReady() {
    return global.grecaptcha && typeof global.grecaptcha.render === 'function';
  }

  function loadCaptchaApi() {
    if (captchaIsReady()) return Promise.resolve(global.grecaptcha);
    if (captchaApiPromise) return captchaApiPromise;

    captchaApiPromise = new Promise(function(resolve, reject) {
      var attemptsRemaining = 100;
      var script = document.querySelector('script[data-gamgee-recaptcha-api]');

      function waitForCaptcha() {
        if (captchaIsReady()) {
          resolve(global.grecaptcha);
          return;
        }

        attemptsRemaining -= 1;
        if (attemptsRemaining <= 0) {
          reject(new Error('CAPTCHA could not be loaded.'));
          return;
        }

        global.setTimeout(waitForCaptcha, 50);
      }

      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.gamgeeRecaptchaApi = 'true';
        script.onerror = function() { reject(new Error('CAPTCHA could not be loaded.')); };
        document.head.appendChild(script);
      }

      waitForCaptcha();
    }).catch(function(error) {
      captchaApiPromise = null;
      throw error;
    });

    return captchaApiPromise;
  }

  function prepareCaptcha(root) {
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
      return { captcha: captcha, widgetId: Number(container.dataset.widgetId) };
    });
  }

  function getCaptchaToken(root) {
    return prepareCaptcha(root).then(function(widget) {
      var token = widget.captcha.getResponse(widget.widgetId);
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

  global.GamgeeForms = Object.freeze({
    submit: submit,
    prepareCaptcha: prepareCaptcha,
    loadCaptchaApi: loadCaptchaApi
  });

  // Start Google reCAPTCHA as soon as the shared form helper loads. Widgets are
  // still rendered only when their visible form opens, but the API is ready then.
  loadCaptchaApi().catch(function() {});
})(window);
