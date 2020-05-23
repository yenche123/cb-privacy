// miniprogram/pages/identity/identity.js

import { IdTool } from "../../utils/identity-tool.js"

Page({
  data: {

  },

  onLoad (options) {

  },

  async onTapAnalyst() {
    console.log("....")
    let openData = await IdTool.getOpenId()
    console.log("openData::", openData)
    let openid = openData.openid || ""
    if (openid === "oEiVO5Us6rT6lDLVssdyuENh3NPI") {
      //cyz的openid
      wx.navigateTo({
        url: '/pages/analyst/analyst',
      })
      return
    }

    wx.showModal({
      title: '提示',
      content: '没有权限哦',
    })
  },

  onTapUser() {
    wx.navigateTo({
      url: '/pages/user/user',
    })
  },


})