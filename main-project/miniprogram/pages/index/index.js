//index.js
//熟悉 big-integer

const paillier = require('../../utils/paillier.js');

Page({
  data: {
    locked: false,
    bitNum: 2048,
  },

  yxData: {
    inputNum: -1,
    publicKey: null,
    privateKey: null,
  },

  onInput(e) {
    console.log(e.detail.value)
    this.yxData.inputNum = e.detail.value
  },

  onLoad () {

  },

  onTapKeyGen() {

    if(this.data.locked) {
      console.log("正在运行。。。")
      return
    }
    this.setData({locked: true})

    wx.showLoading({title: '密钥生成中..'})

    const {bitNum} = this.data
    let oS = Date.now()
    console.log(" ")
    console.log("开始运行：：")
    const { publicKey, privateKey } = paillier.generateRandomKeys(bitNum)

    let nS = Date.now()
    let diffS = nS - oS
    console.log("" + bitNum + "位密钥 生成时间：", diffS, " 毫秒")

    console.log(" ")
    console.log(" ")

    wx.setStorage({
      key: "PUBLIC_KEY",
      data: publicKey,
      success(res) {
        console.log("存储 PUBLIC_KEY")
        console.log(res)
      },
      fail(err) {
        console.log("存储 PRIVATE_KEY 失败")
        console.log(err)
      }
    })

    setTimeout(() => {
      wx.setStorage({
        key: "PRIVATE_KEY",
        data: privateKey,
        success(res) {
          console.log("存储 PRIVATE_KEY")
          console.log(res)
        },
        fail(err) {
          console.log("存储 PRIVATE_KEY 失败")
          console.log(err)
        }
      })

    }, 1000)

    wx.hideLoading()

    wx.showModal({
      title: "" + bitNum + "位密钥生成成功",
      content: '总耗时 ' + diffS + ' ms',
    })

    this.setData({ locked: false })


  },

  onReady() {
    console.log("密钥初始化..")

    let pk = wx.getStorageSync("PUBLIC_KEY")
    let sk = wx.getStorageSync("PRIVATE_KEY")

    if(!pk || !sk) {
      console.log("初始化失败...")
      return
    }
    const stp1 = Date.now()
    const publicKey = new paillier.PublicKey(pk.n, pk.g)
    const stp2 = Date.now()

    console.log("初始化公钥 耗时: ", (stp2 - stp1), " 毫秒")
    console.log("公钥: ", publicKey)
    console.log(" ")

    const privateKey = new paillier.PrivateKey(sk.lambda, sk.mu, sk._p, sk._q, sk.publicKey)
    const stp3 = Date.now()
    console.log("初始化私钥 耗时: ", (stp3 - stp2), " 毫秒")
    console.log("私钥: ", privateKey)
    console.log(" ")

    this.yxData.publicKey = publicKey
    this.yxData.privateKey = privateKey
  },

  onTapEncrypt() {
    let m1 = this.yxData.inputNum
    let {publicKey, privateKey} = this.yxData
    console.log("被加密的数字: ", m1)
    if (m1 <= 0 || !m1) {
      wx.showModal({
        title: '数字不存在',
        content: '请输入数字',
      })
      console.log("数字不存在")
      return
    }

    if (typeof m1 === "string") {
      m1 = Number(m1)
    }

    console.log("公钥: ", publicKey)
    if(!publicKey) {
      wx.showToast({title: '公钥不存在', icon: "none"})
      console.log("公钥不存在")
      return
    }

    console.log("。。。")
    console.log(" ")

    wx.showLoading({
      title: '加密中',
    })

    let oS = Date.now()
    let c1 = publicKey.encrypt(m1)
    let nS = Date.now()
    let diff1 = nS - oS
    console.log("加密完成，耗时: ", diff1, " 毫秒")
    console.log("密文: ", c1)
    console.log(" ")

    this.setData({ time1: diff1})

    let oS2 = Date.now()
    let c2 = publicKey.encrypt(19999)
    let nS2 = Date.now()
    let diff2 = nS2 - oS2
    console.log("加密完成，耗时: ", diff2, " 毫秒")
    console.log("密文: ", c2)
    console.log(" ")
    this.setData({ time2: diff2 })

    // let oS3 = Date.now()
    // let c3 = publicKey.encrypt(m1)
    // let nS3 = Date.now()
    // let diff3 = nS3 - oS3
    // console.log("加密完成，耗时: ", diff3, " 毫秒")
    // console.log("密文: ", c3)
    // console.log(" ")
    // this.setData({ time3: diff3 })

    // let oS4 = Date.now()
    // let c4 = publicKey.encrypt(m1)
    // let nS4 = Date.now()
    // let diff4 = nS4 - oS4
    // console.log("加密完成，耗时: ", diff4, " 毫秒")
    // console.log("密文: ", c4)
    // console.log(" ")
    // this.setData({ time4: diff4 })

    // let oS5 = Date.now()
    // let c5 = publicKey.encrypt(m1)
    // let nS5 = Date.now()
    // let diff5 = nS5 - oS5
    // console.log("加密完成，耗时: ", diff5, " 毫秒")
    // console.log("密文: ", c5)
    // console.log(" ")
    // this.setData({ time5: diff5 })

    wx.hideLoading()
    wx.showToast({title: '加密完成'})


    let s11 = Date.now()
    let enSum = publicKey.addition(c1, c2)
    let s12 = Date.now()
    let diff21 = s12 - s11
    console.log("加法耗时: ", diff21, " 毫秒")
    console.log("enSum: ", enSum)
    console.log(" ")


    let sum = privateKey.decrypt(enSum)
    let s13 = Date.now()
    let diff32 = s13 - s12
    console.log("解密耗时: ", diff32, " 毫秒")
    console.log("解密结果: ", sum)



    //开始上报数据

  },

  onTapCloud() {
    wx.cloud.callFunction({
      name: "addNum",
      data: {x: 1, y: 3},
    }).then(res => {
      console.log("返回云函数结果")
      console.log(res)
    }).catch(err => {
      console.log("返回结果错误")
      console.log(err)
    })
  },

})