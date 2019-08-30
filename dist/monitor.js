(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Monitor = factory());
}(this, function () { 'use strict';

  var extra = {
    ADD_DATA: {},
    ERROR_LIST: [],
    beginTime: 0,
    loadTime: 0,
    ajaxTime: 0,
    fetchTime: 0,
    reportFn: undefined,
    reportTimeOutHandler: undefined,
  };

  const options = {
    // 上报地址
    domain: 'http://localhost/api',
    // 脚本延迟上报时间
    outTime: 500,
    // ajax请求时需要过滤的url信息
    filterUrl: [],
    // 是否上报页面性能数据
    isPage: true,
    // 是否上报ajax性能数据
    isAjax: true,
    // 是否上报页面资源数据
    isResource: true,
    // 是否上报错误信息
    isError: true,
    // 提交参数
    add: {},
  };

  const error = {
    t: '',
    n: 'js',
    msg: '',
    data: {},
  };

  const store = {
    //资源列表
    resourceList: [],
    // 页面性能列表
    performance: {},
    // 错误列表
    errorList: [],
    // 页面fetch数量
    fetchLoadNum: 0,
    // ajax onload数量
    ajaxLoadNum: 0,
    // 页面ajax数量
    ajaxLength: 0,
    // 页面fetch总数量
    fetchLength: 0,
    // 页面ajax信息
    ajaxMsg: {},
    // ajax成功执行函数
    goingType: '',
    // 是否有ajax
    haveAjax: false,
    // 是否有fetch
    haveFetch: false,
    // 来自域名
    preUrl:
      document.referrer && document.referrer !== location.href
        ? document.referrer
        : '',
    // 当前页面
    page: '',
  };

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

  function randomString(length = 10) {
    const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789';
    const maxPos = $chars.length;
    let pwd = '';
    for (let i = 0; i < length; i++) {
      pwd = pwd + $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd + new Date().getTime();
  }

  var utils = {
    randomString: randomString,
  };

  function clear(type = 0) {
    if (window.performance && window.performance.clearResourceTimings) {
      window.performance.clearResourceTimings();
    }
    store.performance = {};
    store.errorList = [];
    store.preUrl = '';
    store.resourceList = [];
    store.page = type === 0 ? window.location.href : '';
    store.haveAjax = false;
    store.haveFetch = false;
    store.ajaxMsg = {};
    extra.ERROR_LIST = [];
    extra.ADD_DATA = {};
    extra.ajaxTime = 0;
    extra.fetchTime = 0;
  }

  function getMarkUser() {
    let markUser = sessionStorage.getItem('ps_markUser') || '';
    const result = {
      markUser: markUser,
      isFristIn: false,
    };
    if (!markUser) {
      markUser = utils.randomString();
      sessionStorage.setItem('ps_markUser', markUser);
      result.markUser = markUser;
      result.isFristIn = true;
    }
    return result;
  }

  // 获得Uv
  function getMarkUv() {
    const date = new Date();
    let markUv = localStorage.getItem('ps_markUv') || '';
    const markUvTime = localStorage.getItem('ps_markUvTime') || '';

    const today = `${date.getFullYear()}/${date.getMonth() +
    1}/${date.getDate()} 23:59:59`;

    if ((!markUv && !markUvTime) || date.getTime() > markUvTime * 1) {
      markUv = utils.randomString();
      localStorage.setItem('ps_markUv', markUv);
      localStorage.setItem('ps_markUvTime', new Date(today).getTime());
    }
    return markUv;
  }

  // 统计页面性能
  function calculatePagePerformance() {
    if (!window.performance) return;
    let timing = window.performance.timing;
    store.performance = {
      // DNS解析时间
      dnst: timing.domainLookupEnd - timing.domainLookupStart || 0,
      //TCP建立时间
      tcpt: timing.connectEnd - timing.connectStart || 0,
      // 白屏时间
      wit: timing.responseStart - timing.navigationStart || 0,
      //dom渲染完成时间
      domt: timing.domContentLoadedEventEnd - timing.navigationStart || 0,
      //页面onload时间
      lodt: timing.loadEventEnd - timing.navigationStart || 0,
      // 页面准备时间
      radt: timing.fetchStart - timing.navigationStart || 0,
      // 页面重定向时间
      rdit: timing.redirectEnd - timing.redirectStart || 0,
      // unload时间
      uodt: timing.unloadEventEnd - timing.unloadEventStart || 0,
      //request请求耗时
      reqt: timing.responseEnd - timing.requestStart || 0,
      //页面解析dom耗时
      andt: timing.domComplete - timing.domInteractive || 0,
    };
  }

  // 统计资源性能
  function calculateResourcePerformance() {
    if (!window.performance || !window.performance.getEntries) return false;
    const resource = window.performance.getEntriesByType('resource');

    const resourceList = [];
    if (!resource && !resource.length) return resourceList;
    resource.forEach(item => {
      if (
        !options.isAjax &&
        (item.initiatorType == 'xmlhttprequest' ||
          item.initiatorType == 'fetchrequest')
      )
        return;
      if (
        !options.isResource &&
        (item.initiatorType != 'xmlhttprequest' &&
          item.initiatorType !== 'fetchrequest')
      )
        return;
      const json = {
        name: item.name,
        method: 'GET',
        type: item.initiatorType,
        duration: item.duration.toFixed(2) || 0,
        decodedBodySize: item.decodedBodySize || 0,
        nextHopProtocol: item.nextHopProtocol,
      };
      const name = item.name ? item.name.split('?')[0] : '';
      const ajaxMsg = store.ajaxMsg[name] || '';
      if (ajaxMsg) {
        json.method = ajaxMsg.method || 'GET';
        json.type = ajaxMsg.type || json.type;
        json.decodedBodySize = json.decodedBodySize || ajaxMsg.decodedBodySize;
      }
      resourceList.push(json);
    });
    store.resourceList = resourceList;
  }

  // 资源过滤
  function filterResource() {
    const _resourceList = store.resourceList || [];
    let _filterUrl = options.filterUrl || [];
    let newList = [];
    if (_resourceList.length && _filterUrl.length) {
      for (let i = 0; i < _resourceList.length; i++) {
        let begin = false;
        for (let j = 0; j < _filterUrl.length; j++) {
          if (_resourceList[i]['name'].indexOf(_filterUrl[j]) > -1) {
            begin = true;
            break;
          }
        }
        if (!begin) newList.push(_resourceList[i]);
      }
    }
    store.resourceList = newList;
  }

  /**
   * @type  1:页面级性能上报  2:页面ajax性能上报  3：页面内错误信息上报
   */
  const report = function(type = 1, opt = {}) {
    const reportFn = extra.reportFn;
    extra.reportTimeOutHandler = setTimeout(() => {
      if (options.isPage) calculatePagePerformance();
      if (options.isResource || options.isAjax) calculateResourcePerformance();
      if (extra.ERROR_LIST.length) {
        store.errorList = store.errorList.concat(extra.ERROR_LIST);
      }

      const markUser = getMarkUser();
      let result = {
        time: new Date().getTime(),
        addData: extra.ADD_DATA,
        markUser: markUser.markUser,
        markUv: getMarkUv(),
        type: type,
        url: window.location.href,
      };
      // 过滤
      filterResource();

      if (type === 1) {
        // 1:页面级性能上报
        result = Object.assign(result, {
          preUrl: store.preUrl,
          errorList: store.errorList,
          performance: store.performance,
          resourceList: store.resourceList,
          isFristIn: markUser.isFristIn,
          screenwidth:
            document.documentElement.clientWidth || document.body.clientWidth,
          screenheight:
            document.documentElement.clientHeight || document.body.clientHeight,
        });
      } else if (type === 2) {
        // 2:页面ajax性能上报
        result = Object.assign(result, {
          resourceList: store.resourceList,
          errorList: store.errorList,
        });
      } else if (type === 3) {
        // 3：页面内错误信息上报
        result = Object.assign(result, {
          errorList: store.errorList,
          resourceList: store.resourceList,
        });
      }
      result = Object.assign(result, options.add);
      reportFn && reportFn(result);
      if (!reportFn && window.fetch) {
        fetch(options.domain, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          type: 'report-data',
          body: JSON.stringify(result),
        });
      }
      // 清空无关数据
      Promise.resolve().then(() => {
        clear();
      });
    }, options.outTime);
  };

  function clearPerformance(type) {
    if (window.performance && window.performance.clearResourceTimings) {
      if (
        store.haveAjax &&
        store.haveFetch &&
        store.ajaxLength == 0 &&
        store.fetchLength == 0
      ) {
        clear(1);
      } else if (!store.haveAjax && store.haveFetch && store.fetchLength == 0) {
        clear(1);
      } else if (store.haveAjax && !store.haveFetch && store.ajaxLength == 0) {
        clear(1);
      }
    }
  }

  //比较onload与ajax时间长度
  function getLargeTime() {
    const { loadTime, ajaxTime, fetchTime } = extra;
    if (store.page !== location.href) {
      // 页面级性能上报
      if (
        store.haveAjax &&
        store.haveFetch &&
        loadTime &&
        ajaxTime &&
        fetchTime
      ) {
        console.log(
          `loadTime:${loadTime},ajaxTime:${ajaxTime},fetchTime:${fetchTime}`
        );
        report(1);
      } else if (store.haveAjax && !store.haveFetch && loadTime && ajaxTime) {
        console.log(`loadTime:${loadTime},ajaxTime:${ajaxTime}`);
        report(1);
      } else if (!store.haveAjax && store.haveFetch && loadTime && fetchTime) {
        console.log(`loadTime:${loadTime},fetchTime:${fetchTime}`);
        report(1);
      } else if (!store.haveAjax && !store.haveFetch && loadTime) {
        console.log(`loadTime:${loadTime}`);
        report(1);
      }
    } else {
      // 单页面内ajax上报
      if (store.haveAjax && store.haveFetch && ajaxTime && fetchTime) {
        console.log(`ajaxTime:${ajaxTime},fetchTime:${fetchTime}`);
        report(2);
      } else if (store.haveAjax && !store.haveFetch && ajaxTime) {
        console.log(`ajaxTime:${ajaxTime}`);
        report(2);
      } else if (!store.haveAjax && store.haveFetch && fetchTime) {
        console.log(`fetchTime:${fetchTime}`);
        report(2);
      }
    }
  }

  // fetch get time
  function getFetchTime(type) {
    store.fetchLoadNum += 1;
    if (extra.reportTimeOutHandler) clearTimeout(extra.reportTimeOutHandler);
    if (store.fetchLength === store.fetchLoadNum) {
      if (type == 'success') {
        console.log('走了 fetch success 方法');
      } else {
        console.log('走了 fetch error 方法');
      }
      store.fetchLoadNum = store.fetchLength = 0;
      extra.fetchTime = new Date().getTime() - extra.beginTime;
      getLargeTime();
    }
  }

  // ajax get time
  function getAjaxTime(type) {
    store.ajaxLoadNum += 1;
    if (extra.reportTimeOutHandler) clearTimeout(extra.reportTimeOutHandler);
    console.log('ajax加载进度', store.ajaxLength, store.ajaxLoadNum);
    if (store.ajaxLoadNum === store.ajaxLength) {
      if (type == 'load') {
        console.log('走了AJAX onload 方法');
      } else if (type == 'readychange') {
        console.log('走了AJAX onreadystatechange 方法');
      } else {
        console.log('走了 error 方法');
      }
      store.ajaxLength = store.ajaxLoadNum = 0;
      extra.ajaxTime = new Date().getTime() - extra.beginTime;
      getLargeTime();
    }
  }

  // ajax统一上报入口
  function ajaxResponse(xhr, type) {
    let errorInfo = Object.assign({}, error);
    errorInfo.t = new Date().getTime();
    errorInfo.n = 'ajax';
    errorInfo.msg = xhr.statusText || 'ajax request error';
    errorInfo.method = xhr.method;
    errorInfo.data = {
      resourceUrl: xhr.responseURL,
      text: xhr.statusText,
      status: xhr.status,
    };
    store.errorList.push(errorInfo);
  }

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

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  /*
   * author: wendux
   * email: 824783146@qq.com
   * source code: https://github.com/wendux/Ajax-hook
   **/
  var ajaxhook = function (ob) {

      //Save original XMLHttpRequest as RealXMLHttpRequest
      var realXhr = "RealXMLHttpRequest";

      //Call this function will override the `XMLHttpRequest` object
      ob.hookAjax = function (proxy) {

          // Avoid double hook
          window[realXhr] = window[realXhr] || XMLHttpRequest;

          XMLHttpRequest = function () {
              var xhr = new window[realXhr];
              // We shouldn't hook XMLHttpRequest.prototype because we can't
              // guarantee that all attributes are on the prototype。
              // Instead, hooking XMLHttpRequest instance can avoid this problem.
              for (var attr in xhr) {
                  var type = "";
                  try {
                      type = typeof xhr[attr]; // May cause exception on some browser
                  } catch (e) {
                  }
                  if (type === "function") {
                      // hook methods of xhr, such as `open`、`send` ...
                      this[attr] = hookFunction(attr);
                  } else {
                      Object.defineProperty(this, attr, {
                          get: getterFactory(attr),
                          set: setterFactory(attr),
                          enumerable: true
                      });
                  }
              }
              this.xhr = xhr;

          };

          // Generate getter for attributes of xhr
          function getterFactory(attr) {
              return function () {
                  var v = this.hasOwnProperty(attr + "_") ? this[attr + "_"] : this.xhr[attr];
                  var attrGetterHook = (proxy[attr] || {})["getter"];
                  return attrGetterHook && attrGetterHook(v, this) || v
              }
          }

          // Generate setter for attributes of xhr; by this we have an opportunity
          // to hook event callbacks （eg: `onload`） of xhr;
          function setterFactory(attr) {
              return function (v) {
                  var xhr = this.xhr;
                  var that = this;
                  var hook = proxy[attr];
                  if (typeof hook === "function") {
                      // hook  event callbacks such as `onload`、`onreadystatechange`...
                      xhr[attr] = function () {
                          proxy[attr](that) || v.apply(xhr, arguments);
                      };
                  } else {
                      //If the attribute isn't writable, generate proxy attribute
                      var attrSetterHook = (hook || {})["setter"];
                      v = attrSetterHook && attrSetterHook(v, that) || v;
                      try {
                          xhr[attr] = v;
                      } catch (e) {
                          this[attr + "_"] = v;
                      }
                  }
              }
          }

          // Hook methods of xhr.
          function hookFunction(fun) {
              return function () {
                  var args = [].slice.call(arguments);
                  if (proxy[fun] && proxy[fun].call(this, args, this.xhr)) {
                      return;
                  }
                  return this.xhr[fun].apply(this.xhr, args);
              }
          }

          // Return the real XMLHttpRequest
          return window[realXhr];
      };

      // Cancel hook
      ob.unHookAjax = function () {
          if (window[realXhr]) XMLHttpRequest = window[realXhr];
          window[realXhr] = undefined;
      };

      //for typescript
      ob["default"] = ob;
  };

  var ajaxHook = createCommonjsModule(function (module) {
  ajaxhook(module.exports);
  });

  function ajaxHandler() {
    ajaxHook.hookAjax({
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

        clearPerformance();
        console.log('open url', result.url);
        store.ajaxMsg[result.url] = result;
        store.ajaxLength = store.ajaxLength + 1;
        store.haveAjax = true;
      },
    });
  }

  const Monitor = function(option, reportFn) {
    extra.beginTime = new Date().getTime();
    extra.loadTime = 0;
    extra.ajaxTime = 0;
    extra.fetchTime = 0;
    extra.reportFn = reportFn;

    const filterUrl = [
      'livereload.js?snipver=1',
      '/sockjs-node/',
      'hm.baidu.com',
    ];
    Object.assign(options, option);
    options.filterUrl = options.filterUrl.concat(filterUrl, [options.domain]);

    // error上报
    if (options.isError) errorHandler(reportFn);

    // 绑定onload事件
    window.addEventListener(
      'load',
      function() {
        extra.loadTime = new Date().getTime() - extra.beginTime;
        getLargeTime();
      },
      false
    );

    // 执行fetch重写
    if (options.isAjax || options.isError) fetchHandler();
    // 拦截ajax
    if (options.isAjax || options.isError) ajaxHandler();
  };

  var monitorjs = Monitor;

  return monitorjs;

}));
