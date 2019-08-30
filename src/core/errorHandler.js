'use strict';
import error from '../model/error';
import store from '../model/store';

const errorHandler = function(reportFn) {
  // img,script,css,jsonp
  window.addEventListener(
    'error',
    function(e) {
      const errorInfo = Object.assign({}, error);
      errorInfo.n = 'resource';
      errorInfo.t = new Date().getTime();
      errorInfo.msg = e.target.localName + ' is load error';
      errorInfo.method = 'GET';
      errorInfo.data = {
        target: e.target.localName,
        type: e.type,
        resourceUrl: e.target.href || e.target.currentSrc,
      };
      if (e.target != window) store.errorList.push(errorInfo);
    },
    true
  );
  // js
  window.onerror = function(msg, _url, line, col, err) {
    const errorInfo = Object.assign({}, error);
    setTimeout(function() {
      col = col || (window.event && window.event.errorCharacter) || 0;
      errorInfo.msg = err && err.stack ? err.stack.toString() : msg;
      errorInfo.method = 'GET';
      errorInfo.data = {
        resourceUrl: _url,
        line: line,
        col: col,
      };
      errorInfo.t = new Date().getTime();
      store.errorList.push(errorInfo);
      // 上报错误信息
      if (store.page === location.href && !store.haveAjax) reportFn(3);
    }, 0);
  };
  // promise
  window.addEventListener('unhandledrejection', function(e) {
    const err = e && e.reason;
    const message = err.message || '';
    const stack = err.stack || '';
    // Processing error
    let resourceUrl, col, line;
    let errs = stack.match(/\(.+?\)/);
    if (errs && errs.length) errs = errs[0];
    errs = errs.replace(/\w.+[js|html]/g, $1 => {
      resourceUrl = $1;
      return '';
    });
    errs = errs.split(':');
    if (errs && errs.length > 1) line = parseInt(errs[1] || 0);
    col = parseInt(errs[2] || 0);
    let errorInfo = Object.assign({}, error);
    errorInfo.msg = message;
    errorInfo.method = 'GET';
    errorInfo.t = new Date().getTime();
    errorInfo.data = {
      resourceUrl: resourceUrl,
      line: col,
      col: line,
    };
    store.errorList.push(errorInfo);
    if (store.page === location.href && !store.haveAjax) reportFn(3);
  });
  // 重写console.error
  const oldError = console.error;
  console.error = function(e) {
    const errorInfo = Object.assign({}, error);
    setTimeout(function() {
      errorInfo.msg = e;
      errorInfo.method = 'GET';
      errorInfo.t = new Date().getTime();
      errorInfo.data = {
        resourceUrl: location.href,
      };
      conf.errorList.push(errorInfo);
      if (conf.page === location.href && !conf.haveAjax) reportFn(3);
    }, 0);
    return oldError.apply(console, arguments);
  };
};

export default errorHandler;
