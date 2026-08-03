(function(global) {
  'use strict';

  function submit(payload, options) {
    var requestOptions = options || {};
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
  }

  global.GamgeeForms = Object.freeze({ submit: submit });
})(window);
