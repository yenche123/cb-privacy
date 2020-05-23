// miniprogram/pages/test-one/test-one.js

const paillier = require('../../utils/paillier.js');

Page({

  data: {
    canIstart: true,
  },

  yxData: {
    pk: null,
    sk: null,
  },

  onLoad: function (options) {

  },

  onTapStart() {
    let {pk, sk} = this.yxData
    if(!pk || !sk) {
      wx.showModal({
        title: '不存在',
        content: 'pk或vk不存在',
      })
      return
    }
  },

})