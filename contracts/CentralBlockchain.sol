pragma solidity ^0.6.4;

contract CentralBlockchain{

    struct Record {
        uint stamp;   //精确到秒
        string anaFunc;  //分析的函数
        string anaTitle;  //分析标题
        string anaDesc;    //分析描述
        string anaNo;    //分析序号 唯一值
        string result;    //存放计算结果
        string token;  //预分析请求的Token
    }

    uint constant MIN_INTERVAL = 60 * 5;        //每轮最小间隔时长
    uint constant MAX_INTERVAL = 60 * 15;        //最大间隔时长
    mapping(string => string) private blackData; //黑名单： 分析者id => 时间戳
    mapping(string => Record[]) private recordData; //所有记录请求的数据：分析者id => Record[]
    string[] chars = [
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"
        "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", 
        "1", "2", "3", "4", "5", "6", "7", "8", "9"
    ];

    //用于第二步：是否可分析 如果可以产生token
    function canAnalyze(
        string memory id, 
        string memory analysis_no, 
        string memory analysis_func,
        string memory analysis_title,
        string memory analysis_desc
    ) public returns(string memory, string memory) {
        //这里返回的值并不重要 因为接收不到
        //所以要用 getTokenByIdAndNo() 另外取

        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        require(keccak256(bytes (analysis_no)) != keccak256(""), "分析序号 不能为空");
        require(keccak256(bytes (analysis_func)) != keccak256(""), "分析函数 不能为空");
        require(keccak256(bytes (analysis_title)) != keccak256(""), "分析标题 不能为空");
        require(keccak256(bytes (analysis_desc)) != keccak256(""), "分析描述 不能为空");

        //黑名单检测
        if(keccak256(bytes (blackData[id])) != keccak256("")) {
            return ("", "黑名单检测不通过");
        }

        //寻找是不是在计算中 是不是分析序号已经存在了 若两者任一为true 则拒绝此次分析请求；
        //否则 通过本次分析请求
        bool hasCalc = false;
        uint nowTime = now;
        Record[] storage rList = recordData[id];
        for(uint i = 0; i < rList.length; i++) {
            uint s1 = rList[i].stamp;
            string memory a1 = rList[i].anaNo;
            if(s1 + MIN_INTERVAL > nowTime) {
                hasCalc = true;
                break;
            }
            if(keccak256(bytes (a1)) == keccak256(bytes (analysis_no))) {
                hasCalc = true;
                break;
            }
        }
        string memory tn = "";  //返回preAnalysisToken
        if(!hasCalc) {
            tn = generatePreAnalysisToken();
            rList.push(
                Record({
                    stamp: now,
                    anaFunc: analysis_func, 
                    anaNo: analysis_no, 
                    result: "", 
                    token: tn,
                    anaTitle: analysis_title,
                    anaDesc: analysis_desc
                })
            );
            return (tn, "成功返回Token");
        }
        return (tn, "正在计算中 或 该分析序号重复了");
    }

    //用于第二步：制造token完毕后 取token
    function getTokenByIdAndNo(string memory id, string memory analysis_no) public view returns(string memory, string memory){
        //返回：token 和 errMsg
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        require(keccak256(bytes (analysis_no)) != keccak256(""), "分析序号 不能为空");

        Record[] memory rList = recordData[id];
        if(rList.length == 0) return ("", "该id未有任何记录");
        for(uint i = 0; i<rList.length; i++) {
            string memory a1 = rList[i].anaNo;
            string memory a2 = rList[i].token;
            uint s1 = rList[i].stamp;
            
            if(keccak256(bytes (a1)) == keccak256(bytes (analysis_no))) {
                if(now > (s1 + MAX_INTERVAL)) {
                    //超过15分钟了
                    return ("", "超过15分钟 token 已失效");
                }
                else {
                    return (a2, "返回token~");
                }
                
            }
        }

        return ("", "没有找到token");
    }

    //用于第三步：正式分析请求时 验证该token是否有效
    function isAnalysisLegal(string memory id, string memory analysis_no, string memory preAnalysisToken) public view returns(bool, string memory) {
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        require(keccak256(bytes (analysis_no)) != keccak256(""), "分析序号 不能为空");

        Record[] memory rList = recordData[id];
        if(rList.length == 0) return (false, " 未曾有过数据噢 ");
        for(uint i = 0; i<rList.length; i++) {
            string memory a1 = rList[i].anaNo;
            string memory a2 = rList[i].token;
            if(keccak256(bytes (a1)) == keccak256(bytes (analysis_no))) {
                if(keccak256(bytes (a2)) == keccak256(bytes (preAnalysisToken))) return (true, "");
                else return (false, "分析函数前后不一");
            }
        }

        return (false, "没有找到对应的 analysis_no");
    }

    function setCalcResult(
        string memory id, string memory analysis_no, string memory calcRes
    ) public returns(bool) {
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        require(keccak256(bytes (analysis_no)) != keccak256(""), "分析序号 不能为空");
        require(keccak256(bytes (calcRes)) != keccak256(""), "分析结果 不能为空");

        Record[] storage rList = recordData[id];
        for(uint i = 0; i<rList.length; i++) {
            string memory a1 = rList[i].anaNo;
            if(keccak256(bytes (a1)) == keccak256(bytes (analysis_no))) {
                rList[i].result = calcRes;
                return true;
            }
        }
        return false;
    }

    //借由 id 和 analysis_no 来取数据
    function  getCalcResult(string memory id, string memory analysis_no) public view returns(string memory, string memory) {
        //返回：res_p、errMsg
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        require(keccak256(bytes (analysis_no)) != keccak256(""), "分析序号 不能为空");

        Record[] memory rList = recordData[id];
        if(rList.length == 0) return ("", "没有该id的记录");
        for(uint i = 0; i<rList.length; i++) {
            string memory a1 = rList[i].anaNo;
            string memory res_p = rList[i].result;
            if(keccak256(bytes (a1)) == keccak256(bytes (analysis_no))) {
                return (res_p, "找到啦 res_p");
            }
        }

        return ("", "没有找到res_p");

    }

    //返回12字符长度的随机字符串
    function generatePreAnalysisToken() internal view returns(string memory) {
        uint charLen = chars.length;
        string memory res = "TN_";
        for(uint i = 0; i < 9; i++) {
            uint rand = uint(keccak256(abi.encodePacked(block.difficulty, now, i))) % charLen;
            res = concatStr(res, chars[rand]);
        }
        return res;
    }

    function concatStr(string memory _a, string memory _b) pure internal returns(string memory) {
        bytes memory _aBytes = bytes(_a);
        bytes memory _bBytes = bytes(_b);
        string memory ab = new string(_aBytes.length + _bBytes.length);
        bytes memory abBytes = bytes(ab);
        uint k = 0;
        for(uint i = 0; i < _aBytes.length; i++) abBytes[k++] = _aBytes[i];
        for(uint i = 0; i < _bBytes.length; i++) abBytes[k++] = _bBytes[i];
        return string(abBytes);
    }

    //测试用：输入id  返回记录长度
    function getRecordLengthById(string memory id) public view returns(uint) {
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        Record[] memory rList = recordData[id];
        return rList.length;
    }

    function getRecordList(string memory id, uint index) public view returns(bool, string memory, string memory){
        //返回是否存在、 anaFunc、 anaNo
        require(keccak256(bytes (id)) != keccak256(""), "分析者 id 不能为空");
        Record[] memory rList = recordData[id];
        if(rList.length <= index) {
            return (false, "", "");
        }
        return (true, rList[index].anaFunc, rList[index].anaNo);
    }

}