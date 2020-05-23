
const crypto = require('crypto');
const bigInt = require('big-integer');

//bitLength Number类型
bigInt.rand = function (bitLength) {   
    // let bytes = bitLength / 8;
    // let buf = Buffer.alloc(bytes);
    // crypto.randomFillSync(buf);
    // buf[0] = buf[0] | 128;  // first bit to 1 -> to get the necessary bitLength
    // return bigInt.fromArray([...buf], 256);

    //cyz改写
  let bytes = bitLength / 8;  
  let aList = []
  for(let i=0; i<bytes; i++) {
    let ran = Math.floor(Math.random() * 256)
    aList.push(ran)
  }
  if(aList[0] < 128) aList[0] = aList[0] + 128 
  return bigInt.fromArray([...aList], 256);
};

bigInt.randBetween = function (start, end) {  // crypto rand in [start, end]
    // let interval = end.subtract(start);
    // let arr = interval.toArray(256).value;
    // let buf = Buffer.alloc(arr.length);
    // let bn;
    // do {
    //     crypto.randomFillSync(buf);
    //     bn = bigInt.fromArray([...buf], 256).add(start);
    // } while (bn.compare(end) >= 0 || bn.compare(start) < 0);
    // return bn;

  //cyz改写
  let interval = end.subtract(start);
  let arr = interval.toArray(256).value;
  let bn;
  do {
    let aList = []
    for(let i=0; i<arr.length; i++) {
      let ran = Math.floor(Math.random() * 256)
      aList.push(ran)
    }
    bn = bigInt.fromArray([...aList], 256).add(start);
  } while (bn.compare(end) >= 0 || bn.compare(start) < 0);
  return bn;
};

bigInt.prime = function (bitLength) {
    let rnd;
    do {
        rnd = bigInt.rand(bitLength);
        console.assert(rnd.bitLength() == bitLength, 'ERROR: ' + rnd.bitLength() + ' != ' + bitLength);
    } while (!rnd.isPrime());
    return bigInt(rnd);
};

bigInt.prototype.bitLength = function () {
    let bits = 1;
    let result = this;
    const two = bigInt(2);
    while (result.greater(bigInt.one)) {
        result = result.divide(two);
        bits++;
    }
    return bits;
};

const generateRandomKeys = function (bitLength = 2048, simplevariant = false) {
    let p, q, n, phi, n2, g, lambda, mu;
    // if p and q are bitLength/2 long ->  2**(bitLength - 2) <= n < 2**(bitLenght) 
    do {
        p = bigInt.prime(bitLength / 2);
        q = bigInt.prime(bitLength / 2);
        n = p.multiply(q);
    } while (q.compare(p) == 0 || n.bitLength() != bitLength);

    phi = p.subtract(1).multiply(q.subtract(1));

    n2 = n.pow(2);

    if (simplevariant === true) {
        //If using p,q of equivalent length, a simpler variant of the key
        // generation steps would be to set
        // g=n+1, lambda=(p-1)(q-1), mu=lambda.modInv(n)
        g = n.add(1);
        lambda = phi;
        mu = lambda.modInv(n);
    } else {
        g = getGenerator(n, n2);
        lambda = bigInt.lcm(p.subtract(1), q.subtract(1));
        mu = L(g.modPow(lambda, n2), n).modInv(n);
    }

    const publicKey = new PaillierPublicKey(n, g);
    const privateKey = new PaillierPrivateKey(lambda, mu, p, q, publicKey);
    return { publicKey: publicKey, privateKey: privateKey };
};

const PaillierPublicKey = class PaillierPublicKey {
    constructor(n, g) {
        this.n = bigInt(n);
        this._n2 = this.n.pow(2); // cache n^2
        this.g = bigInt(g);
    }
    get bitLength() {
        return this.n.bitLength();
    }
    encrypt(m) {
        let r;
        do {
            r = bigInt.randBetween(2, this.n);
        } while (r.leq(1));
        return this.g.modPow(bigInt(m), this._n2).multiply(r.modPow(this.n, this._n2)).mod(this._n2);
    }
    addition(...ciphertexts) {
        return ciphertexts.reduce((sum, next) => sum.multiply(bigInt(next)).mod(this._n2), bigInt(1));   //reduce最后一个参数为 sum的初始值 在这里即为1
    }
    multiply(c, k) { // c is ciphertext. k is a number
        return bigInt(c).modPow(k, this._n2);
    }
};

const PaillierPrivateKey = class PaillierPrivateKey {
    constructor(lambda, mu, p, q, publicKey) {
        this.lambda = bigInt(lambda);
        this.mu = bigInt(mu);
        this._p = bigInt(p);
        this._q = bigInt(q);
        this.publicKey = publicKey;
    }
    get bitLength() {
        return this.publicKey.n.bitLength();
    }
    get n() {
        return this.publicKey.n;
    }
    decrypt(c) {
        return L(bigInt(c).modPow(this.lambda, this.publicKey._n2), this.publicKey.n).multiply(this.mu).mod(this.publicKey.n);
    }
};

function L(a, n) {
    return a.subtract(1).divide(n);
}

function getGenerator(n, n2 = n.pow(2)) {
    const alpha = bigInt.randBetween(2, n);
    const beta = bigInt.randBetween(2, n);
    return alpha.multiply(n).add(1).multiply(beta.modPow(n, n2)).mod(n2);
}

module.exports = {
    generateRandomKeys: generateRandomKeys,
    PrivateKey: PaillierPrivateKey,
    PublicKey: PaillierPublicKey
};
