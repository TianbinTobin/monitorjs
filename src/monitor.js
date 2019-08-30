'use strict';

import extra from './model/extra';
import options from './model/options';
import errorHandler from './core/errorHandler';
import fetchHandler from './core/fetchHandler';
import ajaxHandler from './core/ajaxHandler';
import { getLargeTime } from './helper';

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

export default Monitor;
