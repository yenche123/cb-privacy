// miniprogram/pages/analyst/analyst.js
//数据分析者 界面
import { IdTool } from "../../utils/identity-tool.js"

Page({

  data: {
    status: 0, //等待促发交易
    statusTip: "请开始数据分析",
  },


  yxData: {
    analystID: "",
    listenerStamp: 0, // 监听的stamp
    title: "明天汇报要交什么~",
    desc: "还不知道哎",
    analysis_no: "oEiVO5Us6rT6lDLVssdyuENh3NPI_1590039852",
  },

  onInput(e) {
    let v = e.detail.value
    let t = e.currentTarget.dataset.inputType
    this.yxData[t] = v
  },

  onBlur(e) {
    let v = e.detail.value
    let t = e.currentTarget.dataset.inputType
    this.yxData[t] = v
  },


  async onLoad (options) {
    let o = await IdTool.getOpenId()
    let i = o.openid || ""
    this.yxData.analystID = i
    console.log("analystID:: ", this.yxData.analystID)

  },

  async onTapStep1() {
    if(this.data.status !== 0) {
      console.log("不可以按哦")
      return
    }

    let yD = this.yxData || {}

    let analystID = yD.analystID || ""
    let analysis_title = yD.title || ""
    let analysis_desc = yD.desc || ""
    let analysis_no = this.getAnalysisNo()

    console.log("去cb operation = 1")

    console.log("analystID: ", analystID)
    console.log("analysis_title: ", analysis_title)
    console.log("analysis_desc: ", analysis_desc)
    console.log("analysis_no: ", analysis_no)

    this.yxData.analysis_no = analysis_no //赋值过去全局


    try {
      this.setData({ status: 0.5, statusTip: "发布交易中.."})
      let res = await wx.cloud.callFunction({
        name: "cb",
        data: {
          operation: 1,
          analystID,
          analysis_title,
          analysis_desc,
          analysis_no,
        }
      })

      console.log("步骤1 云函数 返回成功")
      console.log(res)

      let resResult1 = res.result || {}
      let isOk1 = resResult1.isOk
      let c = resResult1.canAnalysisHash || ""
      if(c) {
        this.goStep2(c)
      }


    }
    catch(err) {
      console.log("云函数出错啦？")
      console.log(err)
      this.setData({ status: 0, statusTip: "发布失败，请重试。。" })
    }
    

  },

  async goStep2(checkHash) {

    let _this = this
    let checkTimes = 0
    this.setData({ status: 1.5, statusTip: "确认交易中.." })

    var _goStep2 = async () => {
      let res2 = await wx.cloud.callFunction({
        name: "cb",
        data: {checkHash, operation: 2},
      })
      console.log("_goStep2 返回结果")
      console.log(res2)
      let res2Result = res2.result || {}
      let status = res2Result.status

      if (status == null && checkTimes < 20) {
        checkTimes++
        setTimeout(() => {
          _goStep2()
        }, 1111)
      }
      else if (status == null && checkTimes >= 20) {
        console.log("测试 20 次了")
        console.log("应该有问题~")
      }
      else if(status == 0) {
        _this.setData({ status: 0, statusTip: "发布交易失败，请重新再试！！"})
      }
      else {
        _this.goStep3()
      }
    }

    try {
      console.log(" ")
      console.log("先等 5 秒钟..")
      setTimeout(() => {
        console.log("等了 5 秒了 去确认交易状态..")
        _goStep2()
      }, 5000)
    }
    catch (err) {
      console.log("goStep2 出现错误")
      console.log(err)
    }

  },

  async goStep3() {
    this.setData({ status: 2.5, statusTip: "取Token中.." })
    let { analysis_no, analystID } = this.yxData

    console.log("analysis_no: ", analysis_no)
    console.log("analystID: ", analystID)

    try {
      let res3 = await wx.cloud.callFunction({
        name: "cb",
        data: { analysis_no, analystID, operation: 3 },
      })
      console.log(" ")
      console.log(" ")
      console.log("取到Token了吗~~")
      console.log(res3)

      let resResult = res3.result || {}
      let tkData = resResult.tkData || {}
      let token = tkData[0] || "乱搞"
      
      console.log("token：", token)
      this.goStep4(token)

    }
    catch (err) {
      console.log("goStep3 出现错误")
      console.log(err)
    }
    
  },

  testStep4() {
    this.goStep4("TN_sqlkb3gl7")
  },

  async goStep4(token) {
    let yD = this.yxData || {}

    let {analystID, analysis_no} = yD
    let analysis_title = yD.title || ""
    let analysis_desc = yD.desc || ""

    this.setData({ statusTip: "验证Token中..", status: 3.5 })

    try {
      let res4 = await wx.cloud.callFunction({
        name: "cb",
        data: {
          analystID,
          analysis_no,
          analysis_title,
          analysis_desc,
          operation: 4,
          preAnalysisToken: token,
        },
      })
      console.log(" ")
      console.log("res4")
      console.log(res4)
      let res4Result = res4.result || {}
      if(res4Result.isOk) {
        this.setData({ statusTip: "完成数据分析创建", status: 4})
      }
      else {
        this.setData({statusTip: "被拒绝的token", status: 0})
      }
    }
    catch(e) {
      console.log("goStep4 出现错误")
      console.log(err)
      this.setData({statusTip: "在step 4 出现错误", status: 0})
    }
  },

  getAnalysisNo() {
    //openid + 时间戳（知精确到秒）
    let s = this.yxData.analystID + "_"
    let n = String(Date.now())
    s += n.substring(0, n.length-3)
    return s
  },

  onTapEdgeServer() {
    let _this = this
    console.log("调用云函数 edgeServer")
    wx.cloud.callFunction({
      name: "edgeServer",
      success(res) {
        console.log("edgeServer 云函数返回成功")
        console.log(res)
        let resResult = res.result || {}
        let res_p = resResult.res_p || ""
        console.log("res_p:: ", res_p)

        if(res_p) _this.setData({statusTip: "得到数据分析结果: " + res_p})
        else _this.setData({statusTip: "没有得到数据分析结果，情稍后重试"})

      },
      fail(err) {
        console.log("edgeServer 云函数返回失败")
        console.log(err)
      }
    })
  },


})