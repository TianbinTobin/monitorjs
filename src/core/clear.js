'use strict';

import extra from '../model/extra';
import store from '../model/store';

export default function clear(type = 0) {
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
