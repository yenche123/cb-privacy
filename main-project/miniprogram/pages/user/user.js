// miniprogram/pages/user/user.js

const paillier = require('../../utils/paillier.js');
import { IdTool } from "../../utils/identity-tool.js"
const bigInt = require('big-integer')


Page({

  data: {
    status: 0,    //0: 等待请求   1：等待用户输入   1.5 提交中   2：提交成功
    inputDisabled: true,
    statusTip: "还没有数据分析噢",
    title: "",
    desc: "",
    company: "",
    analystID: "",
    btnText: "提交",
  },

  yxData: {
    analysis_no: "",
    listener: 0,
    myNumber: -1,
    pk: null,
    deviceID: "",
    nickName: "",
  },

  async onLoad() {
    let openData = await IdTool.getOpenId()
    this.yxData.deviceID = openData.openid || "未知的id"
    this.yxData.nickName = IdTool.getNickName()
  },

  onInputAndBlur(e) {
    let v = e.detail.value
    if(typeof v === 'string') {
      v = Number(v)
    }
    if(v >= 0 && v < 99) {
      this.yxData.myNumber = v
    }
    else {
      this.showillegal()
    }
    
  },

  showillegal() {
    wx.showToast({
      title: '',
      icon: "不合规的输入",
    })
  },

  onShow() {
    this.startListener()
  },

  startListener() {
    let _this = this
    let li = this.yxData.listener
    if (li) return

    const noww = Date.now()
    console.log("现在时间戳： ", noww)


    const db = wx.cloud.database()
    const _ = db.command
    const ago = 1000 * 60 * 60 * 9 //取9小时内的


    var run = () => {
      db.collection("Analysis")
        .where({
          createStamp: _.gte(noww - ago),
          res_p: _.exists(false),
          analysis_no: _.exists(true),
          analystID: _.exists(true),
          analysis_title: _.exists(true),
          analysis_desc: _.exists(true),
        })
        .orderBy("createStamp", "desc")
        .get()
        .then(res => {
          console.log("看一下 res")
          console.log(res)
          let d = res.data || []
          if(d.length > 0) {
            _this.closeListener()
            _this.packData(d[0])
          }
          else {
            _this.yxData.listener = setTimeout(() => {
              run()
            }, 5000)
          }
          
        })
        .catch(err => {
          console.log("出现错误")
          console.log("先关闭")
          console.log(err)
          _this.closeListener()
          _this.setData({ statusTip: "出现错误，请稍后再试" })
        })
    }

    run()

  },

  packData(res) {

    var arrToBigInt = (list, isSign) => {
      var v = list, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
      while (--l >= 0) {
        digit = String(v[l])
        str += zeros.slice(digit.length) + digit
      }
      var sign = isSign ? "-" : ""
      return bigInt(sign + str)
    }

    this.yxData.analysis_no = res.analysis_no
    let tmpPk = res.pk
    console.log("序号：", this.yxData.analysis_no)
    console.log("暂时的公钥：", tmpPk)
    
    if(tmpPk) {
      //构造两个大数 再把value替换掉
      // let N = bigInt("11 1231111 1111111 1411511")
  
      let N = arrToBigInt([...tmpPk.n.value], tmpPk.n.sign)
      let G = arrToBigInt([...tmpPk.g.value], tmpPk.g.sign)
      
      // Object.assign(N, {value: [...tmpPk.n.value]})
      // Object.assign(G, {value: [...tmpPk.g.value]})
      
      console.log("N: ")
      console.log(N)
      console.log("G: ")
      console.log(G)


      const pk = new paillier.PublicKey(N, G)
      console.log("看一下生成的公钥：")
      console.log(pk)
      this.yxData.pk = pk
      
    }
    else {
      this.showTip("没有公钥", "请退出重试")
      return
    }

    this.setData({
      status: 1,
      inputDisabled: false,
      title: res.analysis_title,
      desc: res.analysis_desc,
      analystID: res.analystID,
      company: res.company,
    })
  },

  onUnload() {
    this.closeListener()
  },

  closeListener() {
    let li = this.yxData.listener
    if (!li) {
      console.log("listener 不存在 不用关闭")
      return
    }

    console.log(" ")
    console.log("去关闭 listener")
    clearTimeout(li)
    this.yxData.listener = 0

  },

  onSubmit() {
    let m = this.yxData.myNumber
    let {status} = this.data
    if(status !== 1) {
      this.showTip("已提交", "请勿重复提交")
      return
    }
    if (m > 0 && m < 100) {
      this.encryptAndSend(m)
    }
    else {
      this.showTip("没有数字", "请输入1-99之间的数")
    }
  },

  async encryptAndSend(m) {
    let { pk, analysis_no, deviceID, nickName } = this.yxData

    if(!pk) {
      this.showTip("没有公钥", "难受..")
      return
    } 

    wx.showLoading({
      title: '加密&发送中..',
    })

    this.setData({ status: 1.5, inputDisabled: true})

    let c = pk.encrypt(m)
    console.log("加密成功！")
    
    
    const db = wx.cloud.database()
    let inserting = await db.collection("EnData")
      .add({
        data: {
          createTime: new Date(),
          analysis_no,
          deviceID,
          enNum: c.toString(),
          nickName,
          createStamp: Date.now(),
        }
      })
    
    console.log("传送成功了吗！", inserting)
    wx.hideLoading()
    this.setData({ status: 2, btnText: "提交成功" })
    wx.showToast({
      title: '已传送',
    })
  },

  showTip(title = "标题", content = "内容") {
    wx.showModal({title, content})
  },

})