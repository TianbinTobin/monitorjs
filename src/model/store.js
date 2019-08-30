'use strict';

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

export default store;
