'use strict';

import ah from 'ajax-hook';
import store from '../model/store';
import options from '../model/options';
import { clearPerformance, getAjaxTime, ajaxResponse } from '../helper';

function ajaxHandler() {
  ah.hookAjax({
    onreadystatechange: function(xhr) {
      if (xhr.readyState === 4) {
        setTimeout(() => {
          if (store.goingType === 'load') return;
          store.goingType = 'readychange';
          const responseURL = xhr.xhr.responseURL
            ? xhr.xhr.responseURL.split('?')[0]
            : '';
          if (store.ajaxMsg[responseURL]) {
            try {
              if (xhr.xhr.response instanceof Blob) {
                store.ajaxMsg[responseURL]['decodedBodySize'] =
                  xhr.xhr.response.size;
              } else {
                store.ajaxMsg[responseURL]['decodedBodySize'] =
                  xhr.xhr.responseText.length;
              }
            } catch (err) {}
            console.log('readychange url', responseURL);
            getAjaxTime('readychange');
          } else {
            console.log('readychange url', responseURL, 'else');
            console.log(JSON.stringify(store.ajaxMsg));
          }
          if (xhr.status < 200 || xhr.status > 300) {
            xhr.method = xhr.args.method;
            ajaxResponse(xhr);
          }
        }, 600);
      }
    },
    onerror: function(xhr) {
      const errorInfo = {};
      if (xhr.args) {
        errorInfo.method = xhr.args.method;
        errorInfo.responseURL = xhr.args.url;
        errorInfo.statusText = 'ajax request error';
        if (store.ajaxMsg[errorInfo.responseURL]) {
          console.log('error url', errorInfo.responseURL);
          getAjaxTime('error');
        }
      }
      ajaxResponse(Object.assign({}, xhr, errorInfo));
    },
    onload: function(xhr) {
      if (xhr.readyState === 4) {
        if (store.goingType === 'readychange') return;
        store.goingType = 'load';
        const responseURL = xhr.xhr.responseURL
          ? xhr.xhr.responseURL.split('?')[0]
          : '';
        if (store.ajaxMsg[responseURL]) {
          try {
            if (xhr.xhr.response instanceof Blob) {
              store.ajaxMsg[responseURL]['decodedBodySize'] =
                xhr.xhr.response.size;
            } else {
              store.ajaxMsg[responseURL]['decodedBodySize'] =
                xhr.xhr.responseText.length;
            }
          } catch (err) {}
          console.log('onload url', responseURL);
          getAjaxTime('load');
        }
        if (xhr.status < 200 || xhr.status > 300) {
          xhr.method = xhr.args.method;
          ajaxResponse(xhr);
        }
      }
    },
    open: function(arg, xhr) {
      if (options.filterUrl && options.filterUrl.length) {
        let begin = false;
        options.filterUrl.forEach(item => {
          if (arg[1].indexOf(item) != -1) begin = true;
        });
        if (begin) return;
      }

      let result = {
        url: arg[1].split('?')[0],
        method: arg[0] || 'GET',
        type: 'xmlhttprequest',
      };
      this.args = result;
      console.log('open url', result.url);
      clearPerformance();
      store.ajaxMsg[result.url] = result;
      store.ajaxLength = store.ajaxLength + 1;
      store.haveAjax = true;
    },
  });
}

export default ajaxHandler;
