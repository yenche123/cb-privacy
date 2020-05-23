var Web3 = require("web3")
var fs = require("fs")
var Tx = require("ethereumjs-tx").Transaction
var ethabi = require("web3-eth-abi")

class Controller {

  constructor() {
    //合约地址
    this.contractAddress = "0x19987BDd141D1F6F582E90C2f35aF43620A93FDc"
    this.getPrice = "0x3B9ACA00" //预估燃料，填 0x3B9ACA00 即可 

    //你可以创建一个 infura.io 的账户 让其负责连接 区块链
    let u = "https://ropsten.infura.io/v3/8e2f5477f42a4ee690a70358b9e0fef2" 
    this.web3 = new Web3(new Web3.providers.HttpProvider(u))
    let p = "./CentralBlockchain_sol_CentralBlockchain.abi"  //智能合约的 .abi 文件
    this.abi = JSON.parse(fs.readFileSync(p).toString())

    this.contract = this.web3.eth.contract(this.abi).at(this.contractAddress)

  }

  //获取随机数 
  //以当前账户有的交易笔数为基准
  async getNonce() {
    let _this = this
    let adr = "0xF026980f5b0CBFDAE700e18950877cfD0AD33F27" //你的以太坊（Ropsten）账户地址
    return new Promise((a, b) => {
      _this.web3.eth.getTransactionCount(adr, (err, nonce) => {
        if (err) {
          console.log("getTransactionCount error")
          console.log(err, nonce)
          b({ err, nonce, cyzMsg: "getTransactionCount err" })
        }
        else {
          a(nonce)
        }

      })
    })
  }

  async queryCB(contractFunc) {
    let _this = this
    return new Promise((a, b) => {

      var sendRawTransactionCallBack = (err, res) => {
        if (err) {
          console.log("在向CB请求时 出错")
          console.log(err)
          b({ err, cyzMsg: "sendRawTransactionCallBack 时  失败" })
        }
        else {
          console.log("在向CB请求时 成功")
          console.log("res::", res)
          a(res)
        }
      }

      _this.web3.eth.estimateGas({
        to: _this.contractAddress,
        data: contractFunc,
      }, (err, estimateGas) => {

        if (err) {
          b({ err, estimateGas, cyzMsg: "在预估气体时出了点错" })
          return
        }

        estimateGas = _this.web3.toHex(estimateGas)
        let nonce = global.getNextNonce()
        let rawTx = {
          nonce,
          gasPrice: _this.getPrice,
          gasLimit: estimateGas,
          to: _this.contractAddress,
          value: '0x00',
          data: contractFunc,
        }

        let tx = new Tx(rawTx, { chain: 'ropsten' })
        let pk = "A62437A77E2155EACB786703775A38F6E674A9AF7590D7D2E3B6C03F65189229"
        pk = pk.toLowerCase()

        const privateKey = new Buffer(pk, 'hex')

        tx.sign(privateKey)
        let serializedTx = tx.serialize()
        let tmp = '0x' + serializedTx.toString('hex')

        _this.web3.eth.sendRawTransaction(tmp, sendRawTransactionCallBack)

      })
    })
  }


  async canAnalyze(id, no, func, title, desc) {
    let _this = this
    let confunc = this.contract.canAnalyze.getData(id, no, func, title, desc)
    return await this.queryCB(confunc)
  }

  //返回交易状态 1：成功  0：失败  null: 未处理
  async queryTransactionStatus(hash) {
    let _this = this
    return new Promise((a, b) => {
      _this.web3.eth.getTransactionReceipt(hash, (err, res) => {
        console.log("查询交易状态的结果")
        console.log("err::", err)
        console.log("res::", res)
        if (res != null) a(parseInt(res.status, 16))
        else a(null)
      })
    })
  }

  async getTokenByIdAndNo(id, no) {
    let _this = this
    let g = this.contract.getTokenByIdAndNo.getData(id, no)
    return new Promise((a, b) => {
      _this.web3.eth.call({
        to: _this.contractAddress,
        data: g,
      }, (err, res) => {
        console.log("getTokenByIdAndNo 的结果：", res)
        console.log("getTokenByIdAndNo 的错误：", err)
        if (err) {
          b({ err, res })
        }
        else {
          let types = ['string', 'string']
          let resStr = ethabi.decodeParameters(types, res)
          a(resStr)
        }
      })
    })
  }

  async isAnalysisLegal(id, no, token) {
    let _this = this
    let g = this.contract.isAnalysisLegal.getData(id, no, token)
    return new Promise((a, b) => {
      _this.web3.eth.call({
        to: _this.contractAddress,
        data: g,
      }, (err, res) => {
        console.log("isAnalysisLegal 的结果：", res)
        console.log("isAnalysisLegal 的错误：", err)
        if (err) {
          b({ err, res })
        }
        else {
          let types = ['bool', 'string']
          let resStr = ethabi.decodeParameters(types, res)
          a(resStr)
        }
      })
    })
  }

  async setCalcResult(id, no, calcRes) {
    let _this = this
    let c = this.contract.setCalcResult.getData(id, no, calcRes)
    return await this.queryCB(c)
  }


}

module.exports = Controller