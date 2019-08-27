'use strict';

function randomString(length = 10) {
  const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789';
  const maxPos = $chars.length;
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd = pwd + $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd + new Date().getTime();
}

module.exports = {
  randomString: randomString,
};
