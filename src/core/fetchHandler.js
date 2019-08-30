'use strict';
import error from '../model/error';
import store from '../model/store';
import { clearPerformance, getFetchTime } from '../helper';

// fetch arguments
function transformArguments(arg) {
  const result = { method: 'GET', type: 'fetchrequest' };
  const args = Array.prototype.slice.apply(arg);

  if (!args || !args.length) return result;
  try {
    if (args.length === 1) {
      if (typeof args[0] === 'string') {
        result.url = args[0];
      } else if (typeof args[0] === 'object') {
        result.url = args[0].url;
        result.method = args[0].method;
      }
    } else {
      result.url = args[0];
      result.method = args[1].method || 'GET';
      result.type = args[1].type || 'fetchrequest';
    }
  } catch (err) {}
  return result;
}

const fetchHandler = function() {
  if (!window.fetch) return;
  const _fetch = fetch;
  window.fetch = function() {
    const _arguments = arguments;
    const result = transformArguments(_arguments);
    if (result.type !== 'report-data') {
      clearPerformance();
      const url = result.url ? result.url.split('?')[0] : '';
      store.ajaxMsg[url] = result;
      store.fetchLength = store.fetchLength + 1;
      store.haveFetch = true;
    }
    return _fetch
      .apply(this, arguments)
      .then(res => {
        if (result.type === 'report-data') return res;
        try {
          const url = res.url ? res.url.split('?')[0] : '';
          res
            .clone()
            .text()
            .then(data => {
              if (store.ajaxMsg[url])
                store.ajaxMsg[url]['decodedBodySize'] = data.length;
            });
        } catch (e) {}
        getFetchTime('success');
        return res;
      })
      .catch(err => {
        if (result.type === 'report-data') return;
        getFetchTime('error');
        //error
        let errorInfo = Object.assign({}, error);
        errorInfo.t = new Date().getTime();
        errorInfo.n = 'fetch';
        errorInfo.msg = 'fetch request error';
        errorInfo.method = result.method;
        errorInfo.data = {
          resourceUrl: result.url,
          text: err.stack || err,
          status: 0,
        };
        store.errorList.push(errorInfo);
        return err;
      });
  };
};

export default fetchHandler;
