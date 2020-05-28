// 云函数入口文件
//centralBlockchain 中枢区块链
const cloud = require('wx-server-sdk')
var Controller = require("./Controller.js")
const paillier = require('paillier.js')
const bigInt = require('big-integer');

cloud.init()


var configNonce = async (ctr1) => {
  let nonce = await ctr1.getNonce()
  console.log("nonce::~~ ", nonce)
  global.nonce = --nonce

  //配置制造随机数 函数
  global.getNextNonce = () => {
    global.nonce++
    return '0x' + global.nonce.toString(16)
  }
}

// 云函数入口函数
exports.main = async (event, context) => {

  const {
    operation = 0,
    analysis_no = "",
    analystID = "",
    analysis_title = "默认标题",
    analysis_desc = "默认描述",
    analysis_func = "AVERAGE",
    range = "DEFAULT",
    company = "上海交通大学",
  } = event

  if(!operation) {
    return {cyzMsg: "没有定义operation"}
  }

  

  try {

    let ctr = new Controller()
    
    const db = cloud.database()
    const _ = db.command

    
    if (operation === 1) {
      //总步骤1 发布交易

      if (!analysis_no) return { cyzMsg: "没有 analysis_no", isOk: false }
      if (!analystID) return { cyzMsg: "没有 analystID", isOk: false }

      await configNonce(ctr)   //因为要发布交易 需要用到nonce 配置一下啦
      console.log("调试信息 断点1 配置完nonce之后")

      let canAnalysisHash = await ctr.canAnalyze(analystID, analysis_no, analysis_func, analysis_title, analysis_desc)
      console.log("看一下 canAnalysisHash:: ", canAnalysisHash)
      return { canAnalysisHash, isOk: true }

    }
    else if(operation === 2) {
      //总步骤2 确认交易
      let checkHash = event.checkHash
      if (!checkHash) return {isOk: false, cyzMsg: "沒有 交易 hash"}
      let status = await ctr.queryTransactionStatus(checkHash)
      return { status, cyzMsg: "看看有没有 status", checkHash, isOk: true }

    }
    else if(operation === 3) {
      //总步骤3 取Token
      if (!analysis_no) return { cyzMsg: "没有 analysis_no", isOk: false }
      if (!analystID) return { cyzMsg: "没有 analystID", isOk: false }

      let tkData = await ctr.getTokenByIdAndNo(analystID, analysis_no)
      return { tkData, cyzMsg: "希望如愿有token", isOk: true }
    }
    else if(operation === 4) {
      //总步骤4 
      //CB 处理正式分析请求
      let preAnalysisToken = event.preAnalysisToken || ""
      if (!preAnalysisToken) return { cyzMsg: "没有 preAnalysisToken", isOk: false }
      if (!analysis_no) return { cyzMsg: "没有 analysis_no", isOk: false }
      if (!analystID) return { cyzMsg: "没有 analystID", isOk: false }


      let isLegalData = await ctr.isAnalysisLegal(analystID, analysis_no, preAnalysisToken)
      console.log("看一下isLegalData")
      console.log(isLegalData)

      if (!isLegalData[0]) {
        return { isOk: false, isLegalData, cyzMsg: "判为不合法的 preAnalysisToken"}
      }

      let { publicKey, privateKey } = paillier.generateRandomKeys(512)
      console.log("看一下 公钥::", publicKey)
      console.log("看一下 私钥::", privateKey)

      let add1 = await db.collection("OnlyCB").add({
        data: {
          analysis_no,
          analystID,
          publicKey,
          privateKey,
          createStamp: Date.now(),
          createTime: db.serverDate(),
        }
      })

      console.log("创建OnlyCB记录：：", add1)

      let add2 = await db.collection("Analysis").add({
        data: {
          analysis_no,
          analysis_title,
          analysis_desc,
          analystID,
          createStamp: Date.now(),
          createTime: db.serverDate(),
          pk: publicKey,
          range,
          company,
        }
      })

      console.log("看一下创建 analysis 成功与否", add2)

      return {cyzMsg: "返回给数据分析者，已创建成功等待计算", add1, add2, isOk: true}

    }
    else if(operation === 5) {
      //入参 analysis_no enSum
      let { enSumValue, actualN} = event
      if(!enSumValue) return {cyzMsg: "没有enSumValue"}
      if(!actualN) return {cyzMsg: "没有actualN"}

      console.log("analysis_no: ", analysis_no)
      console.log("actualN: ", actualN)
      console.log("enSumValue 的类型： ", typeof enSumValue)
      
      let a5 = await db.collection("OnlyCB")
        .where({
          analysis_no,
        })
        .get()
      let d5List = a5.data || []
      if(d5List.length < 1) {
        return {cyzMsg: "没有该记录", isOk: false}
      }

      console.log("看一下 d5List", d5List)

      let d5 = d5List[0] || {}
      let _id = d5._id || ""
      let tmpSk = d5.privateKey || {}
      let tmpPk = d5.publicKey || {}
      let N = bigInt("111111111111111111111111111111")
      let G = bigInt("111111111111111111111111111111")
      let P = bigInt("111111111111111111111111111111")
      let Q = bigInt("111111111111111111111111111111")
      let LAMBDA = bigInt("111111111111111111111111111111")
      let MU = bigInt("111111111111111111111111111111")
      N.value = tmpPk.n.value
      G.value = tmpPk.g.value
      P.value = tmpSk._p.value
      Q.value = tmpSk._q.value
      LAMBDA.value = tmpSk.lambda.value
      MU.value = tmpSk.mu.value
      console.log("到这里有问题吗~")
      console.log(" ")
      let pk = new paillier.PublicKey(N, G)
      let sk = new paillier.PrivateKey(LAMBDA, MU, P, Q, pk)

      let encrypedSum = bigInt("111111111111111111111111111111")
      encrypedSum.value = [...enSumValue]

      let sum = sk.decrypt(encrypedSum)
      console.log("会哭吗！！！", sum)
      let res_p = sum / actualN
      res_p = String(res_p)
      let a6 = await db.collection("Analysis").doc(_id).update({
        data: {
          res_p,
        }
      })

      console.log("是否更新成功呢？")
      console.log(a6)

      return {sum, res_p}
    }

  }
  catch (e) {
    console.log("出现错误la 走catch分支~")
    console.log(e)
    return {isOk: false, err: e, cyzMsg: "出现了错误~"}
  }

  

}