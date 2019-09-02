'use strict';
import utils from '../utils';
import store from '../model/store';
import options from '../model/options';
import extra from '../model/extra';
import clear from './clear';

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
    if (reportFn) {
      reportFn(result)
        .then(res => {
          console.log('上报成功', res);
        })
        .catch(err => {
          console.log('上报失败', err);
        });
    }
    if (!reportFn && window.fetch) {
      fetch(options.domain, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        type: 'report-data',
        body: JSON.stringify(result),
      })
        .then(res => {
          console.log('上报成功', res);
        })
        .catch(err => {
          console.log('上报失败', err);
        });
    }
    extra.reportTimeOutHandler = undefined;
    // 清空无关数据
    Promise.resolve().then(() => {
      clear();
    });
  }, options.outTime);
  console.log('准备上报', extra.reportTimeOutHandler);
};

export default report;
