'use strict';
import extra from './model/extra';
import store from './model/store';
import error from './model/error';
import report from './core/report';
import clear from './core/clear';

export function clearPerformance(type) {
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
export function getLargeTime() {
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
export function getFetchTime(type) {
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
export function getAjaxTime(type) {
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
export function ajaxResponse(xhr, type) {
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
