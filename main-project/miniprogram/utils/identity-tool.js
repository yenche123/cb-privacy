
//可以缓存用户的 OPENID

class IdTool {
  static openid = ""
  static userInfo = {}

  static getOpenId() {
    let _this = this
    return new Promise(a => {
      if(_this.openid) {
        a({openid: _this.openid})
        return
      }

      var getIdRemotely = () => {
        wx.cloud.callFunction({
          name: "getOpenid",
          success(res) {
            console.log("getOpenid 成功返回")
            console.log(res)
            let result = res.result || {}
            let openid = result.openid || ""
            _this.openid = openid
            a({ openid })

            wx.setStorage({
              key: 'USER_OPENID',
              data: openid,
            })
          },
          fail(err) {
            console.log("getOpenid 失败返回")
            console.log(err)
          }
        })
      }


      try {
        let d = wx.getStorageSync("USER_OPENID")
        console.log("有openid的缓存吗:", d)
        if (d) {
          _this.openid = d
          a({ openid: _this.openid })
          return
        }
        
        getIdRemotely()
      }
      catch (e) {
        console.log("取缓存出现错误啦 ", e)
        getIdRemotely()
      }
      
    })
  }

  static setUserInfo(u) {
    console.log("u: ", u)
    this.userInfo = u
  }

  static getNickName() {
    return this.userInfo.nickName || "未知用户"
  }
}

export {IdTool}