//---------------------------------------------------------------------
// Nano P2PoW  - Client in JavaScript
//
// Copyright (c) 2020 Anarkrypto
//
// URL: http://github.com/anarkrypto/p2pow
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//---------------------------------------------------------------------

if (isNodeJS()) {
  global.fetch = require('node-fetch');
  global.BigNumber = require('./nano_utils/bignumber.min.js')
  global.blake2b = require('./nano_utils/blake2b.js')
  global.nacl = require('./nano_utils/nacl.js')
}

const P2PoW = (function () {  

  const STATE_BLOCK_PREAMBLE_BYTES = new Uint8Array(32)
  STATE_BLOCK_PREAMBLE_BYTES[31] = 6
  const TunedBigNumber = BigNumber.clone({ EXPONENTIAL_AT: 1e9 })
  const alphabet = '13456789abcdefghijkmnopqrstuwxyz'

  function importConfigFromFile(filename) {
    return new Promise((resolve, reject) => {
      if (!checkString(filename)) {
        reject({ fail: "Invalid Config File Name" })
        return
      }
      loadJsonFile(filename).then(json => {
        importConfig(json).then(res => {
          resolve({ successful: true })
        }).catch(err => {
          reject({ fail: err.fail })
        })
      }).catch(err => {
        reject({ fail: err })
      })
    })
  }

  function importConfig(configs) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof configs !== "object") reject({ fail: "Invalid P2PoW.config. Not an Object" })
        if (!checkURL(configs.node)) reject({ fail: "Invalid node URL!" })
        if (!checkNanoAddress(configs.trackerAccount)) reject({ fail: "Invalid Registration Account!" })
        if (!checkAmount(configs.registrationCode)) rreject({ fail: "Invalid Registration Code!" })
        if (!checkPort(configs.servicePort)) reject({ fail: "Invalid Service Port!" })
        if (!checkNanoAddress(configs.representative)) reject({ fail: "Invalid Representative Account!" })
        if (!checkAmount(configs.maxFee)) reject({ fail: "Invalid Max Fee!" })
        if (!checkTimeout(configs.timeout)) reject({ fail: "Invalid TimeOut!" })
        P2PoW.config = configs
        resolve({ successful: true })
      } catch (err) {
        reject({ fail: err })
      }
    })
  }

  function sync(delay, callback) {
    return new Promise((resolve, reject) => {
      if (callback && typeof callback !== "function") return reject({ fail: "Callback must to be a function" })
      getworkersRegisters(callback)
        .catch(err => {
          return reject({ fail: err.fail })
        })
        .then(workersRegisters => {
          getWorkersOnline(workersRegisters, callback)
            .catch(err => {
              return reject({ fail: err.fail })
            })
            .then(workersOnline => {
              loopSync(delay, callback)
              return resolve({ registered: workersRegisters, online: workersOnline })
            })
        })
    })
  }

  async function loopSync(delay, callback) {
    while (true) {
      await sleep(delay)
      getworkersRegisters(callback).then(workersRegisters => {
        getWorkersOnline(workersRegisters, callback)
          .catch(err => { 
            if (callback) callback({ fail: err.fail }) 
          })
      }).catch(err => { 
        if (callback) callback({ fail: err.fail }) })
    }
  }

  async function getworkersRegisters(callback) {
    return new Promise((resolve, reject) => {
      if (callback && typeof callback !== "function") return reject({ fail: "Callback must to be a function" })
      let block_register, workerIPAddress, promises = []
      pending_transactions(P2PoW.config.trackerAccount, P2PoW.config.registrationCode)
      .then(transactions => {
        for (let block in transactions) {
          if (transactions[block] == P2PoW.config.registrationCode) {
            promises.push(
              block_info(block)
                .then(block_register => {
                  workerIPAddress = ipAddressInNanoAccount(block_register.representative)
                  if (checkIPaddress(workerIPAddress)) {
                    if (!(workerIPAddress in P2PoW.workersRegisters)) {
                      P2PoW.workersRegisters[workerIPAddress] = block_register
                      P2PoW.workersRegisters[workerIPAddress].hash = block
                      P2PoW.workersRegisters[workerIPAddress].local_timestamp = block_register.local_timestamp
                      if (callback) callback({ found: workerIPAddress })
                    }
                  } else {
                    if (callback) callback({ warning: "Invalid IP found: " + workerIPAddress })
                  }
                })
            )
          }
        }
        Promise.all(promises).then(() => {
          resolve(P2PoW.workersRegisters)
        })
      })
    })
  }

  async function getWorkersOnline(workersList, callback) {
    return new Promise((resolve, reject) => {
      if (callback && typeof callback !== "function") return reject({ fail: "Callback must to be a function" })
      let promises = [], workersOnline = {}
      for (workerAddress in workersList) {
        promises.push(
          requestInfo(workerAddress)
            .then(requestInfo => {
              if (checkWorkerConfig(requestInfo)) {
                if (!(requestInfo.ip in P2PoW.workersOnline)) P2PoW.workersOnline[requestInfo.ip] = []
                P2PoW.workersOnline[requestInfo.ip].reward_account = requestInfo.reward_account
                P2PoW.workersOnline[requestInfo.ip].fee = requestInfo.fee
                P2PoW.workersOnline[requestInfo.ip].fee_receive = requestInfo.fee_receive
                P2PoW.workersOnline[requestInfo.ip].max_multiplier = parseFloat(requestInfo.max_multiplier)
                P2PoW.workersOnline[requestInfo.ip].min_multiplier = parseFloat(requestInfo.min_multiplier)
                P2PoW.workersOnline[requestInfo.ip].version = requestInfo.version
                P2PoW.workersOnline[requestInfo.ip].ip = requestInfo.ip
                workersOnline[requestInfo.ip] = requestInfo
                if (callback) callback({ worker: requestInfo.ip, status: "online", ...P2PoW.workersOnline[requestInfo.ip] })
              } else {
                if (callback) callback({ warning: requestInfo.ip + " : Invalid config!" })
                if (P2PoW.workersOnline[requestInfo.ip]) delete P2PoW.workersOnline[requestInfo.ip]
                if (callback) callback({ worker: requestInfo.ip, status: "invalid" })
              }
            }).catch(err => {
              if (P2PoW.workersOnline[err.ip]) delete P2PoW.workersOnline[err.ip]
              if (callback) callback({ worker: err.ip, status: "offline" })
            })
        )
      }
      Promise.all(promises).then(() => {
        return resolve(workersOnline)
      })
    })
  }

  async function requestInfo(workerAddress) {
    return new Promise((resolve, reject) => {
      const workerUrlInfo = "http://" + workerAddress + ':' + P2PoW.config.servicePort + "/request_info"
      fetchWithTimeout(workerUrlInfo, 6000, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }).then(response => {
        return resolve({ ip: workerAddress, ...response })
      }).catch(err => {
        return reject({ fail: err, ip: workerAddress })
      })
    })
  }

  async function workerSolve(user_block, reward_block, workerIP) {
    return new Promise((resolve, reject) => {
      const workerRequest = "http://" + workerIP + ":" + P2PoW.config.servicePort + "/request_work"
      const blocks = { "user_block": user_block.block, "reward_block": reward_block.block }
      fetchWithTimeout(workerRequest, P2PoW.config.timeout, {
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify(blocks),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }).then(worker_json => {
        worker_json.reward_block = reward_block.hash
        resolve (worker_json)
      }).catch (err => {
        resolve ({fail: err})
      })
    })
  }

  async function requestWork(transactionInfo, callback) {
    return new Promise(async function (resolve, reject) {
      if (callback && typeof callback !== "function") return reject({ fail: "Callback must to be a function" })
      try {
        if (!checkNanoAddress(transactionInfo.account)) return reject ({ fail: "Invalid Source Account!" })
        if (!checkAmount(transactionInfo.balance)) return reject ({ fail: "Invalid Balance!" })
        if (!checkAmount(transactionInfo.maxFee)) return reject ({ fail: "Invalid Max Fee!" })
        if (!checkKey(transactionInfo.secret)) return reject ({ fail: "Invalid Secret!" })

        if ("previous" in transactionInfo) {
          if (!checkKey(transactionInfo.previous)) return reject ({ fail: "Invalid Previous!" })
        } else {
          transactionInfo.previous = account_frontier(transactionInfo.account)
        }
        if ("representative" in transactionInfo) {
          if (!checkNanoAddress(transactionInfo.representative)) return reject ({ fail: "Invalid Representative Account!" })
        } else {
          transactionInfo.representative = account_representative(transactionInfo.account)
        }

        let workersList = []

        if (! "workers" in transactionInfo) return reject({ fail: "Invalid Worker Address" })
        if (!checkString(transactionInfo.workers)) {
          for (worker_ip in transactionInfo.workers) {
            if (!checkIPaddress(transactionInfo.workers[worker_ip])) return reject({ fail: "Invalid Worker Address! ( " + transactionInfo.workers[worker_ip] + " )" })
          }
          workersList = transactionInfo.workers
        } else {
          if (checkIPaddress(transactionInfo.workers)) {
            workersList = [transactionInfo.workers]
          } else {
            return reject ({ "fail": "Invalid Worker Address! ( " + transactionInfo.workers + " )" })
          }
        }

        let parse = "", feeType = "fee"
        switch (true) {
          case "link_as_account" in transactionInfo:
            parse = parseNanoAddress(transactionInfo.link_as_account)
            if (parse.valid == true) {
              transactionInfo.link = parse.publicKey
            } else {
              return reject ({ fail: "Invalid Link as Account!" })
            }
            break;
          case "destination" in transactionInfo:
            parse = parseNanoAddress(transactionInfo.destination)
            if (parse.valid == true) {
              transactionInfo.link = parse.publicKey
            } else {
              return reject ({ fail: "Invalid Destination!" })
            }
            break;
          case "link" in transactionInfo:
            if (!checkKey(transactionInfo.link)) return reject ({ fail: "Invalid Link!" })
            break;
          default:
            return reject ({ fail: "Invalid Link / Destination!" })
        }

        //determine fee type
        switch (transactionInfo.type) {
          case "send":
            feeType = "fee"
            break;
          case "receive":
            feeType = "fee_receive"
            break;
          case "send":
            feeType = "fee"
            break;
          default:
            feeType = "fee"
        }

        //create reward block and request PoW from workers
        let user_block = await create_block(transactionInfo.account, transactionInfo.link, transactionInfo.balance, transactionInfo.previous, transactionInfo.representative, transactionInfo.secret)
        let testedWorkers = 0, workersResponse = [], reward_blocks = [], reward_hashs = [], response = {}, finished = false, denied = false, details = {}

        for (workerip in workersList) {
          if (workersList[workerip] in P2PoW.workersOnline) {
            if (BigNumber(P2PoW.workersOnline[workersList[workerip]].fee).isLessThanOrEqualTo(transactionInfo.maxFee)) {
              let balance_final = BigNumber(user_block.block.balance).minus(P2PoW.workersOnline[workersList[workerip]][feeType]).toString(10)
              let reward_block = create_block(transactionInfo.account, P2PoW.workersOnline[workersList[workerip]].reward_account, balance_final, user_block.hash, P2PoW.config.representative, transactionInfo.secret)
              reward_blocks[workersList[workerip]] = reward_block
              reward_hashs.push(reward_block.hash)
              testedWorkers++
              workersResponse[workersList[workerip]] = workerSolve(user_block, reward_block, workersList[workerip])
            } else {
              details[workersList[workerip]] = "Fee is greater than your max fee"
              if (callback) callback({ alert: workerip + " fee is greater than your max fee" })
            }
          } else {
            details[workersList[workerip]] = "Not found in workersOnline"
            if (callback) callback({ alert: workerip + " not found in workersOnline" })
          }
        }
        if (testedWorkers == 0) return reject({ fail: "Not Found available workers", details: details })

        //If all workers return something before resolving the transaction
        let aa = Promise.all(Object.values(workersResponse)).then(async function () {

          await sleep(1000) //time delay to track transaction

          let errors = 0;
          for (let workerIP in workersResponse) {
            workersResponse[workerIP].then(val => {
              workersResponse[workerIP] = val
              if ("fail" in workersResponse[workerIP]) errors++
            }).catch(err => {
              errors++
            })
          }

          if (!finished && Object.values(workersResponse).length == errors) {
            reject({ fail: "Denied Requests", details: { ...workersResponse } })
            denied = true
          }
        })

        //track transaction / account status
        const startTime = new Date().getTime()
        while ((new Date().getTime() - startTime) <= (P2PoW.config.timeout)) {

          //get the last block of the account
          let frontier = await account_frontier(transactionInfo.account)

          //a new transaction exists
          if (frontier != user_block.block.previous) {

            //if a wrong previous was passed
            if (frontier != user_block.hash && !reward_hashs.includes(frontier)) {
              finished = true
              return reject({ fail: "Wrong Previous Passed!" })
            }

            // if the frontier is the user transaction, wait for ~400 miliseconds for the reward transaction
            for (i = 0; i < 8 && frontier == user_block.hash; i++) {
              frontier = await account_frontier(transactionInfo.account)
              await sleep(50)
            }

            //if the frontier is still the user transaction, return only a success confirmation with user transaction info
            if (frontier == user_block.hash) {
              response = { 
                            successful: true, 
                            user_block: { hash: user_block.hash, work: "unknown" },
                            reward_block: { hash: 'unknown', work: "unknown", account: 'unknown', ip: 'unknown' }
                          }
              finished = true
              if (callback && denied) callback(response)
              return resolve(response)
            }

            //analyze workers callbacks and return the winner details
            for (let workerip in reward_blocks) {
              if (reward_blocks[workerip].hash == frontier) {
                if ("successful" in workersResponse[workerip] && 'user_block' in workersResponse[workerip].successful && 'work' in workersResponse[workerip].successful.user_block) {
                  user_block.block.work = workersResponse[workerip].successful.user_block.work
                } else {
                  user_block.block.work = "unknown"
                }
                if ("successful" in workersResponse[workerip] && 'reward_block' in workersResponse[workerip].successful && 'work' in workersResponse[workerip].successful.reward_block) {
                  reward_blocks[workerip].work = workersResponse[workerip].successful.reward_block.work
                } else {
                  reward_blocks[workerip].work = "unknown"
                }
                response = { successful: true,
                             user_block: { hash: user_block.hash, work: user_block.block.work },
                             reward_block: { hash: reward_blocks[workerip].hash, work: reward_blocks[workerip].work, account: P2PoW.workersOnline[workerip].reward_account, ip: workerip } 
                            }
                finished = true
                if (callback && denied) callback(response)
                return resolve(response)
              }
            }
          }
          await sleep(100)
        }

        //timed out, no new transactions
        return reject({ fail: "timeout" })

      } catch (err) {
        return reject({ fail: err })
      }

    })

  }

  //Extracts worker ip from registration transaction
  function ipAddressInNanoAccount(account) {

    const byteArrayToLong = function (byteArray) {
      let value = 0;
      for (let i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
      }
      return value;
    };

    const intToIPv4 = function (int) {
      const part1 = int & 255;
      const part2 = ((int >> 8) & 255);
      const part3 = ((int >> 16) & 255);
      const part4 = ((int >> 24) & 255);

      return part1 + "." + part2 + "." + part3 + "." + part4;
    }

    const byteArrayToIPv6 = function (byteArray) {
      let ipv6 = ""
      let i = 0;
      while (byteArray.length > i) {
        ipv6 += ('0' + (byteArray[i] & 0xFF).toString(16)).slice(-2)
        ipv6 += ('0' + (byteArray[i + 1] & 0xFF).toString(16)).slice(-2)
        i += 2
        if (byteArray.length > i) ipv6 += ':'
      }
      const ipv6_compressed = ipv6.replace(/\b:?(?:0+:?){2,}/g, '::') //compress ipv6
      return ipv6_compressed.toUpperCase()
    }

    const publicKeyBytes = parseNanoAddress(account).publicKeyBytes
    const utf8 = new TextDecoder("utf-8").decode(publicKeyBytes)
    if (utf8.substr(-28) == '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0') {
      const int_ipv4 = byteArrayToLong(publicKeyBytes.slice(0, 4))
      return intToIPv4(int_ipv4)
    } else {
      if (utf8.substr(-16) == '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0') {
        return byteArrayToIPv6(publicKeyBytes.slice(0, 16))
      } else {
        return "Invalid IP Address"
      }
    }
  }

  /***** Utils Functions *****/
  async function loadJsonFile(file, callback) {
    return new Promise((resolve, reject) => {
      if(!isNodeJS()){
        fetch(file, {
          mode: 'no-cors',
        }).then(json => {
          resolve(json.json())
        }).catch(err => {
          reject(err)
        })
      } else {
        try {
          const json = require(file)
          resolve(json)
        } catch (err){
          reject(err)
        }
      }
    })
  }

  function hexToByteArray(hex) {
    let bytes = []
    for (let c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes);
  }

  function byteArrayToHex(bytes) {
    let hex = []
    for (let i = 0; i < bytes.length; i++) {
      let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      hex.push((current >>> 4).toString(16));
      hex.push((current & 0xF).toString(16));
    }
    return hex.join("").toUpperCase();
  }

  function compareArrays(array1, array2) {
    for (let i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) return false
    }
    return true
  }

  function checkNanoAddress(address) {
    const parseResult = parseNanoAddress(address)
    return parseResult.valid
  }

  function checkAmount(amount) {
    const minAmount = 0
    const maxAmount = BigNumber("1000000000000000000000000000000").multipliedBy("133248297") //Max Nano Supply in raws
    if (isNaN(amount)) return false
    try {
      if (BigNumber(amount).isLessThan(minAmount) || BigNumber(amount).isGreaterThan(maxAmount)) return false
    } catch (err) {
      return false
    }
    return true
  }

  function checkKey(key) {
    if (/^([0-9A-F]){64}$/i.test(key)) {
      return true
    } else {
      return false
    }
  }

  function checkTimeout(ms) {
    if (isNaN(ms)) return false
    if (ms > 300000 || ms < 1) return false
    return true
  }

  function checkString(candidate) {
    return typeof candidate === 'string'
  }

  function checkURL(string) {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

  function checkPort(port) {
    if (isNaN(port)) return false
    if (port < 0 || port > 65535) return false
    return true
  }

  function checkWorkerConfig(config) {
    try {
      if (checkNanoAddress(config.reward_account) && checkAmount(config.fee) && checkAmount(config.fee_receive) && !(isNaN(config.min_multiplier)) && !(isNaN(config.max_multiplier)) && checkVersion(config.version)) {
        return true
      } else {
        return false
      }
    } catch (err) {
      return false
    }
  }

  function checkIPaddress(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
      return "ipv4"
    }
    if (/^((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*::((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*|((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4})){7}$/g.test(ipaddress)) {
      return "ipv6"
    }
    return false
  }

  function checkVersion(version) {
    if (P2PoW.config.supportedVersions.indexOf(version) !== -1) {
      return true
    } else {
      return false
    }
  }

  function fetchWithTimeout(uri, time, options) {
    return new Promise((resolve, reject) => {
      try {
        const controller = new AbortController()
        const config = { ...options, signal: controller.signal }
        const timeout = setTimeout(() => {
          controller.abort()
        }, time)
        fetch(uri, config)
          .then(response => {
            if (!response.ok) return reject(`${response.status}: ${response.statusText}`)
            resolve(response.json())
          })
          .catch(error => {
            if (error.name === 'AbortError') return reject('Response timed out')
            reject(error.message)
          })
      } catch (err) {
        reject(err)
      }
    })
  }

  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }


  /***** Nano RPC Functions *****/
  async function account_balance(account) {
    const data = {
      "action": "account_balance",
      "account": account
    }
    const json = await fetch(P2PoW.config.node, {
      mode: 'cors',
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json());
    return (json)
  }

  async function account_frontier(account) {
    const data = {
      "action": "accounts_frontiers",
      "accounts": [account],
    }
    const json = await fetch(P2PoW.config.node, {
      mode: 'cors',
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json());
    if (json.frontiers != "" && account in json.frontiers) {
      return json.frontiers[account]
    } else {
      return "0000000000000000000000000000000000000000000000000000000000000000"
    }
  }

  async function account_representative(account) {
    const data = {
      "action": "account_representative",
      "accounts": [account],
    }
    const json = await fetch(P2PoW.config.node, {
      mode: 'cors',
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json());
    if (json.representative != "") {
      return json.representative
    } else {
      return P2PoW.config.representative
    }
  }

  async function pending_transactions(account, threshold) {
    const data = {
      "action": "pending",
      "account": account,
      "count": -1,
      "threshold": threshold
    }
    const json = await fetch(P2PoW.config.node, {
      mode: 'cors',
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json());
    return (json["blocks"])
  }

  async function block_info(hash) {
    const data = {
      "action": "block_info",
      "json_block": "true",
      "hash": hash
    }
    const json = await fetch(P2PoW.config.node, {
      mode: 'cors',
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json());
    if ("contents" in json) {
      let block = json.contents
      block.amount = json.amount
      block.hash = hash
      block.local_timestamp = json.local_timestamp
      return block
    } else {
      return false
    }
  }


  /* Nano crypto Functions */
  function parseNanoAddress(address) {
    const invalid = { valid: false, publicKey: null, publicKeyBytes: null }
    if (!checkString(address) || !/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(address)) {
      return invalid
    }
    let prefixLength = address.indexOf('_') + 1
    const publicKeyBytes = decodeNanoBase32(address.substr(prefixLength, 52))
    const publicKey = byteArrayToHex(publicKeyBytes)
    const checksumBytes = decodeNanoBase32(address.substr(-8))
    const computedChecksumBytes = blake2b(publicKeyBytes, null, 5).reverse()
    const valid = compareArrays(checksumBytes, computedChecksumBytes)
    if (!valid) return invalid
    return {
      publicKeyBytes,
      publicKey,
      valid: true
    }
  }

  function hashBlock(params) {
    const publicKeyBytes = parseNanoAddress(params.account).publicKeyBytes
    const previousBytes = hexToByteArray(params.previous)
    const representativeBytes = parseNanoAddress(params.representative).publicKeyBytes
    const balanceBytes = hexToByteArray(rawsToHex(params.balance)) //hexToByteArray(balanceHex)
    let linkBytes = Uint8Array
    if (checkNanoAddress(params.link)) {
      linkBytes = parseNanoAddress(params.link).publicKeyBytes
    } else {
      linkBytes = hexToByteArray(params.link)
    }

    const context = blake2bInit(32)
    blake2bUpdate(context, STATE_BLOCK_PREAMBLE_BYTES)
    blake2bUpdate(context, publicKeyBytes)
    blake2bUpdate(context, previousBytes)
    blake2bUpdate(context, representativeBytes)
    blake2bUpdate(context, balanceBytes)
    blake2bUpdate(context, linkBytes)
    const hashBytes = blake2bFinal(context)

    return byteArrayToHex(hashBytes)
  }

  function create_block(account, link, balance, previous, representative, secret) {
    if (previous == "") {
      previous = "0000000000000000000000000000000000000000000000000000000000000000"
    }
    balance = balance.toString().replace(/n/gi, "")
    linkAsAccount = parseNanoAddress(link)
    if (linkAsAccount.valid) {
      linkAsAccount.account = link
      link = linkAsAccount.publicKey
    }
    let block = {
      "type": "state",
      "account": account,
      "representative": representative,
      "previous": previous,
      "balance": balance,
      "link": link
    }
    if (linkAsAccount.valid) block.link_as_account = linkAsAccount.account
    const hash = hashBlock(block)
    block.signature = signBlock(hash, secret)
    return { hash: hash, block: block }
  }

  function signBlock(hash, secretKey) {
    const blockHashBytes = hexToByteArray(hash)
    const secretKeyBytes = hexToByteArray(secretKey)
    const signatureBytes = nacl.sign.detached(blockHashBytes, secretKeyBytes)
    return byteArrayToHex(signatureBytes)
  }

  function rawsToHex(raws) {
    return TunedBigNumber(raws).toString(16).padStart(32, '0')
  }

  function readChar(char) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) {
      throw new Error(`Invalid character found: ${char}`)
    }
    return idx
  }

  function decodeNanoBase32(input) {
    const length = input.length
    const leftover = (length * 5) % 8
    const offset = leftover === 0 ? 0 : 8 - leftover
    let bits = 0
    let value = 0
    let index = 0
    let output = new Uint8Array(Math.ceil((length * 5) / 8))
    for (let i = 0; i < length; i++) {
      value = (value << 5) | readChar(input[i])
      bits += 5
      if (bits >= 8) {
        output[index++] = (value >>> (bits + offset - 8)) & 255
        bits -= 8
      }
    }
    if (bits > 0) {
      output[index++] = (value << (bits + offset - 8)) & 255
    }
    if (leftover !== 0) {
      output = output.slice(1)
    }
    return output
  }

  return {
    importConfigFromFile: importConfigFromFile,
    importConfig: importConfig,
    sync: sync,
    getworkersRegisters: getworkersRegisters,
    getWorkersOnline: getWorkersOnline,
    requestInfo: requestInfo,
    requestWork: requestWork,
    ipAddressInNanoAccount: ipAddressInNanoAccount,
    checkNanoAddress: checkNanoAddress,
    checkAmount: checkAmount,
    account_balance: account_balance,
    account_frontier: account_frontier,
    pending_transactions: pending_transactions,
    block_info: block_info,

    config: {},
    workersRegisters: {},
    workersOnline: {}
  }

})();


function isNodeJS() {
  if (typeof window === 'undefined') {
    return true
  } else {
    return false
  }
}

if (isNodeJS()) module.exports = P2PoW
