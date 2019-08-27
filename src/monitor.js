'use strict';

const utils = require('./utils');

const ADD_DATA = {};
const ERROR_LIST = [];

const Performance = function(option, reportFn) {
  const filterUrl = [
    '/api/v1/report/web',
    'livereload.js?snipver=1',
    '/sockjs-node/',
  ];
  let opt = {
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
  opt = Object.assign(opt, option);
  opt.filterUrl = opt.filterUrl.concat(filterUrl);
};
