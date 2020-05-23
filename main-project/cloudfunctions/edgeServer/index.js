// 云函数入口文件
const cloud = require('wx-server-sdk')
const bigInt = require('big-integer');
const paillier = require('./paillier.js');

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const ago = 1000 * 60 * 60 * 9 //9小时前的
  const noww = Date.now()

  let a1 = await db.collection("Analysis")
    .where({
      createStamp: _.gte(noww - ago),
      res_p: _.exists(false),
      analysis_no: _.exists(true),
      analystID: _.exists(true),
      analysis_title: _.exists(true),
      analysis_desc: _.exists(true),
    })
    .orderBy("createStamp", "desc")
    .limit(3)
    .get()

  let d1 = a1.data || []
  console.log("打印一下 d1", d1)
  if(d1.length < 1) {
    return {cyzMsg: "暂无数据分析噢", isOk: true}
  }

  let pack1 = d1[0] || {}
  let tmpPk = pack1.pk

  let N = bigInt("111111111111111111111111111111")
  let G = bigInt("111111111111111111111111111111")
  N.value = tmpPk.n.value
  G.value = tmpPk.g.value
  let publicKey = new paillier.PublicKey(N, G)
  let analysis_no = pack1.analysis_no || ""
  console.log("看一下 分析序号：", analysis_no)
  // console.log("看一下 publicKey：", publicKey)

  let a2 = await db.collection("EnData")
    .where({
      analysis_no,
      enNum: _.exists(true),
    })
    .orderBy("createStamp", "asc")
    .get()

  let d2 = a2.data || []
  let actualN = d2.length

  console.log("actualN: ", actualN)

  if (actualN < 2) {
    return { cyzMsg: "加密数据的记录小于2，不用计算", actualN}
  }

  let sum = bigInt(d2[0].enNum)
  for (let i = 1; i < actualN; i++) {
    let v = d2[i]
    let enNum = v.enNum
    let tmpInt = bigInt(enNum)
    sum = publicKey.addition(sum, tmpInt)
  }

  let a3 = await cloud.callFunction({
    name: "cb",
    data: {
      actualN,
      enSumValue: sum.value,
      operation: 5,
      analysis_no,
    }
  })

  let a3Res = a3.result || {}

  console.log("在 edgeServer 打印 cb返回的结果： ", a3)

  return a3Res

}