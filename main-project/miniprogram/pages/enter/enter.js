// miniprogram/pages/enter/enter.js

import {IdTool} from "../../utils/identity-tool.js"

Page({

  data: {

  },

  onLoad (options) {

  },

  getUserInfo(e) {
    console.log(e)
    let {userInfo} = e.detail
    if(!userInfo) {
      console.log("没有登录")
      wx.showModal({
        title: '提示',
        content: '需要登录以辨识你噢~',
      })
      return
    }

    IdTool.setUserInfo(userInfo)

    // wx.showModal({
    //   title: '隐私提示',
    //   content: '授权的昵称和头像仅用于实验测试，实验结束后将销毁，请放心使用~',
    //   confirmText: "了解",
    // })

    wx.navigateTo({
      url: '/pages/identity/identity',
    })

  },

  onReady (options) {
    IdTool.getOpenId().then(res => {})
  },

})