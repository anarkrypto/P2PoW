//---------------------------------------------------------------------
// Nano P2PoW  - Client in JavaScript
//
// Copyright (c) 2020 Anarkrypto
//
// URL: http://github.com/anarkrypto/p2pow
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php


// *** ATTENTION 18/12/2020***
// This code is an initial version for demonstrating the P2PoW Client
// and should not the best example for implementing the client.
// To study the best methods visit the repository:
// https://github.com/anarkrypto/P2PoW/blob/master/client_JS/

//---------------------------------------------------------------------


/********* style *********/
function changeColor(e) {
  document.body.className = e.currentTarget.className;
}

[].slice.call(document.querySelectorAll('.colorOptions button'), 0).forEach(function (button) {
  button.addEventListener('click', changeColor);
});

const settings = {
  fill: '#53b6ac',
  background: 'rgba(245, 245, 245, 0.5)'
}
const sliders = document.querySelectorAll('.range-slider');
Array.prototype.forEach.call(sliders, (slider) => {
  slider.querySelector('input').addEventListener('input', (event) => {
    slider.querySelector('span').innerHTML = event.target.value / 100000;
    P2PoW.config.maxFee = toRaws(event.target.value / 100000)
    applyFill(event.target);
    updateFeeStatus()
  });
  applyFill(slider.querySelector('input'));
});

function applyFill(slider) {
  const percentage = 100 * (slider.value - slider.min) / (slider.max - slider.min);
  const bg = `linear-gradient(90deg, ${settings.fill} ${percentage}%, ${settings.background} ${percentage + 0.1}%)`;
  slider.style.background = bg;
}

/********* Workers List *********/
async function listWorkers() {
  P2PoW.sync(30000, callback)
    .then(all_workers => {
      console.log("Found " + Object.keys(all_workers.registered).length + " workers registrations")
      console.log("Found " + Object.keys(all_workers.online).length + " workers online")
    })
}

function createWorker(ip) {
  const worker = '<div class="worker" id="worker_' + ip.replace(/\.|\:/g, "-") + '" data-ip="' + ip + '"> \
      <text> ' + ip + '</text> \
      <span class="feeHigh" style="display: none">Fee too high</span> \
      <ul><li>Status: <span class="status">Loading...</span></li> \
      <ul class="openInfo"> \
        <li><text>Speed</text>: <span class="speed">?</span> seconds</li> \
        <li>Account: <span class="account"></span></li> \
        <li>Fee: <span class="fee"></span></li> \
        <li>Fee receive: <span class="fee_receive"></span></li> \
        <li>Min multiplier: <span class="min_multiplier"></span></li>\
        <li>Max multiplier: <span class="max_multiplier"></span></li> \
        <li>Version: <span class="version"></span></li> \
      </ul></ul>\
      <div class="test_worker" onclick="testWorker(\'' + ip + '\')"></div>\
      <div class="winner-reward"></div>\
  </div>'
  document.querySelector('div.workers').innerHTML += worker
}

//callback function
function callback(callback) {
  if ("found" in callback) createWorker(callback.found)
  if ("status" in callback && callback.status == "online") showWorkerOnline(callback.worker)
  if ("status" in callback && callback.status == "offline") showWorkerOffline(callback.worker)
  if ("status" in callback && callback.status == "invalid") showWorkerInvalid(callback.worker)
  if ("warning" in callback) console.warn(callback.warn)
}

async function showWorkerOffline(workerIP) {
  const workerId = "#worker_" + workerIP.replace(/\.|\:/g, "-")
  if (!$(workerId).hasClass('offline')) {
    console.log("offlining: " + workerIP)
    console.log(workerIP + " - Offline")
    $(workerId).removeClass('online')
    $(workerId).addClass('offline')
    $(workerId + ' .status').textSlow('Offline')
    $('.workers').append($(workerId)) //move to the end
  }
}

async function showWorkerInvalid(workerIP) {
  const workerId = "#worker_" + workerIP.replace(/\.|\:/g, "-")
  $(workerId).addClass('invalid')
  $(workerId + ' .status').textSlow('Invalid Config!')
  $('.workers').append($(workerId)) //move to the end
}

async function showWorkerOnline(workerIP) {
  const workerId = "#worker_" + workerIP.replace(/\.|\:/g, "-")
  console.log(workerIP + " - Online")
  $(workerId).removeClass('offline')
  $(workerId).addClass('online')
  $(workerId + ' .status').textSlow('Online')
  if (BigNumber(P2PoW.workersOnline[workerIP].fee).isGreaterThan(P2PoW.config.maxFee)) $(workerId + " .feeHigh").show()
  $(workerId + ' .account').textSlow(abbrevNanoAddress(P2PoW.workersOnline[workerIP].reward_account))
  $(workerId + ' .fee').textSlow(toMegaNano(P2PoW.workersOnline[workerIP].fee))
  $(workerId + ' .fee_receive').textSlow(toMegaNano(P2PoW.workersOnline[workerIP].fee_receive))
  $(workerId + ' .min_multiplier').textSlow(P2PoW.workersOnline[workerIP].min_multiplier.toFixed(1))
  $(workerId + ' .max_multiplier').textSlow('' + P2PoW.workersOnline[workerIP].max_multiplier.toFixed(1))
  $(workerId + ' .version').textSlow(P2PoW.workersOnline[workerIP].version)
  $(workerId + ' .openInfo').slideDown("slow")
  $('.workers').prepend($(workerId))
}

async function updateFeeStatus() {
  for (workerIP in P2PoW.workersOnline) {
    let workerId = "#worker_" + workerIP.replace(/\.|\:/g, "-")
    if (BigNumber(P2PoW.workersOnline[workerIP].fee).isGreaterThan(P2PoW.config.maxFee)) {
      $(workerId + " .feeHigh").show()
    } else {
      $(workerId + " .feeHigh").hide()
    }
  }
}

async function rewardAnimation(workerId) {
  $(workerId + ' .winner-reward').show()
  $(workerId + ' .winner-reward').addClass('active')
  await sleep(1000)
  $(workerId + ' .winner-reward').fadeOut(1000)
  await sleep(1000)
  $(workerId + ' .winner-reward').removeClass('active')
}

/********* P2PoW Config *********/
function showMaxFee() {
  var slider = ".feeSlider"
  $(slider + ' .range-slider__value').text(toMegaNano(P2PoW.config.maxFee))
  $(slider + ' #range-slider-val').val(toMegaNano(P2PoW.config.maxFee) * 100000)
  applyFill(document.querySelector(slider + ' input'));
}

function listConfig() {
  $('#showSettings .node').val(P2PoW.config.node)
  $('#showSettings .tracker_account').val(P2PoW.config.trackerAccount)
  $('#showSettings .registration_code').val(P2PoW.config.registrationCode)
  $('#showSettings .service_port').val(P2PoW.config.servicePort)
  $('#showSettings .default_representative').val(P2PoW.config.representative)
  $('#showSettings .supported_versions').val(P2PoW.config.supportedVersions)
}

function checkConfig() {
  if (!checkURL($('#showSettings .node').val())) {
    alert("Invalid node URL!")
    return false
  }
  if (!checkNanoAddress($('#showSettings .tracker_account').val())) {
    alert("Invalid Registration Account!")
    return false
  }
  if (!checkAmount($('#showSettings .registration_code').val())) {
    alert("Invalid Registration Code!")
    return false
  }
  if (!checkPort($('#showSettings .service_port').val())) {
    alert("Invalid Service Port!")
    return false
  }
  if (!checkNanoAddress($('#showSettings .default_representative').val())) {
    alert("Invalid Representative Account!")
    return false
  }
  return true
}

function saveConfig() {
  if (checkConfig()) {
    P2PoW.config.node = $('#showSettings .node').val()
    P2PoW.config.trackerAccount = $('#showSettings .tracker_account').val()
    P2PoW.config.registrationCode = $('#showSettings .registration_code').val()
    P2PoW.config.servicePort = $('#showSettings .service_port').val()
    P2PoW.config.representative = $('#showSettings .default_representative').val()
    alert("Changed Config")
  }
}

/********* P2PoW Solve Works *********/
async function startCount(worker, mili) {
  workersActivated.push(worker)
  var workerId = '#worker_' + worker.replace(/\.|\:/g, "-")
  P2PoW.workersOnline[worker].status = "active"
  var timeBefore = new Date().getTime()
  while (P2PoW.workersOnline[worker].status == "active") {
    $(workerId + " .speed").text((new Date().getTime() - timeBefore) / 1000)
    await sleep(mili)
  }
  var timeElapsed = $(workerId + " .speed").text()
  $("#worker_" + worker.replace(/\.|\:/g, "-") + " .speed").text("~ " + timeElapsed)
}

function stopCount(worker) {
  workersActivated.splice(workersActivated.indexOf(worker), 1)
  P2PoW.workersOnline[worker].status = "standby"
}

function removePending(hash) {
  delete wallet.pending[hash]
  $("#showAccount #block_" + hash).fadeOut()
  sleep(400).then(() => {
    $("#showAccount #block_" + hash).remove();
    if (Object.keys(wallet.pending).length <= 1) $(".button-receiveAll").fadeOut()
  })
}

function solveBlock(worker, link, balance_final) {
  return new Promise((resolve, reject) => {
    var workerId = '#worker_' + worker.replace(/\.|\:/g, "-")

    $(".competitionButton").prop('disabled', true);

    //determine transaction type
    if (wallet.balance > balance_final) {
      type = "send"
    } else if (wallet.balance < balance_final) {
      type = "receive"
    } else {
      type = "change"
    }

    $(workerId).addClass("activated")
    startCount(worker, 100)

    P2PoW.requestWork(
      {
        type: type,
        account: wallet.address,
        link: link,
        balance: balance_final,
        previous: wallet.previous,
        representative: P2PoW.config.representative,
        workers: [worker],
        maxFee: P2PoW.config.maxFee,
        secret: wallet.secret
      },
      callback
    )
      .then(async function (res) {
        stopCount(worker)
        $(workerId).removeClass("activated")
        $(".competitionButton").prop('disabled', false);

        console.log(JSON.stringify(res, false, 2))

        console.info("P2PoW successfully! Hash: " + res.user_block.hash)
        rewardAnimation(workerId)

        resolve(res)

      })
      .catch(async function (err) {
        stopCount(worker)
        $(workerId).removeClass("activated")
        $(".competitionButton").prop('disabled', false);

        console.log(JSON.stringify(err, false, 2))

        console.log("P2PoW fail! Error: " + err.fail)
        $(workerId + " .speed").textSlow("Fail")

        reject(err.fail)
      })
  })
}

async function testWorker(worker, competition) {
  if (receivingAll) return
  alertPopup = false
  return new Promise((resolve, reject) => {
    var workerId = '#worker_' + worker.replace(/\.|\:/g, "-")
    if ($(workerId + ".activated").length) {
      console.warn("Worker already activated.")
      return reject("Worker already activated")
      pending_block_hash = false
    }
    if (wallet.seed.length == 0) {
      console.error("Wallet not Found!")
      showAlert("Wallet not Found!", "img/alert.png", "Create or import a wallet first", "popup('showAlert'); elScroll('.nano-bar', 80); awaitNewAccount()")
      pending_block_hash = false
      return reject("Wallet not found")
    }
    if (BigNumber(P2PoW.workersOnline[worker].fee).isGreaterThan(P2PoW.config.maxFee)) {
      console.warn("Worker " + worker + " fee is too high")
      if (!competition) {
        showAlert("Worker fee is too high!", "img/alert.png", "Your Max Fee is less than the worker fee. You can ajust a new fee if you want", "popup('showAlert'); elScroll('.feeSlider', 100); ")
      }
      alertPopup = true
      pending_block_hash = false
      return reject("Worker fee is too high")
    }

    //receiving function is activated
    if (pending_block_hash !== false) {
      if (BigNumber(P2PoW.workersOnline[worker].fee_receive).isLessThanOrEqualTo(BigNumber(wallet.pending[pending_block_hash].amount).plus(wallet.balance))) {

        console.log("Receiving Pending Transaction: " + pending_block_hash)
        var balance_final = BigNumber(wallet.balance).plus(wallet.pending[pending_block_hash].amount).toString(10)
        solveBlock(worker, pending_block_hash, balance_final)
          .then(async function (res) {
            wallet.balancePending = BigNumber(wallet.balancePending).minus(wallet.pending[pending_block_hash].amount).toString(10)
            removePending(pending_block_hash)

            sleep(100).then(() => { pending_block_hash = false })

            synchronizeWallet().then(() => { updateBalance() })

            resolve(res)

          }).catch(err => {
            sleep(100).then(() => { pending_block_hash = false })
            reject(err)
          })
        return
      } else {
        //insufficient balance
        if (!competition) showAlert("Insufficient funds!", "img/alert.png", "You have not sufficient balance. Make a small deposit.", "popup('showAlert'); popup('showAccount')")
        console.warn("You have not sufficient balance.")
        alertPopup = true
        sleep(100).then(() => { pending_block_hash = false })
        return reject("insufficient funds")
      }
    }

    //if has sufficient balance to send
    if (BigNumber(P2PoW.workersOnline[worker].fee).plus(wallet.amount).isLessThanOrEqualTo(wallet.balance)) {
      console.info("You have sufficient balance. Sending transaction")
      console.info("Testing worker: " + worker)
      //send
      var balance_final = BigNumber(wallet.balance).minus(wallet.amount).toString(10)
      solveBlock(worker, wallet.link, balance_final)
        .then(async function (res) {

          synchronizeWallet().then(res => { updateBalance() })

          resolve(res)

        }).catch(err => {
          reject(err)
        })

      //if has not sufficient balance, check and receive pending transactions
    } else {
      for (let block in wallet.pending) {
        if (BigNumber(P2PoW.workersOnline[worker].fee_receive).isLessThanOrEqualTo(wallet.pending[block].amount)) {
          console.log("You have not sufficient balance. Receiving pending transaction")
          //receive
          var balance_final = BigNumber(wallet.balance).plus(wallet.pending[block].amount).toString(10)
          solveBlock(worker, block, balance_final)
            .then(res => {
              wallet.balancePending = BigNumber(wallet.balancePending).minus(wallet.pending[block].amount).toString(10)
              removePending(block)
              synchronizeWallet().then(() => { updateBalance() })
              resolve(res)
            }).catch(err => {
              reject(err)
            })
          return
        }
      }

      //insufficient balance
      if (!competition) showAlert("Insufficient funds!", "img/alert.png", "You have not sufficient balance. Make a small deposit.", "popup('showAlert'); popup('showAccount')")
      console.warn("You have not sufficient balance.")
      alertPopup = true
      reject("insufficient funds")
    }
  })
}

async function testAllWorkers() {
  if (receivingAll) return
  return new Promise(async function (resolve, reject) {

    if (wallet.seed.length == 0) {
      console.error("Wallet not Found!")
      showAlert("Wallet not Found!", "img/alert.png", "Create or import a wallet first", "popup('showAlert'); elScroll('.nano-bar', 80); awaitNewAccount()")
      return reject("Wallet not found")
    }
    let promises = [], worker = ""
    for (worker in P2PoW.workersOnline) {
      promises.push(testWorker(worker, true))
    }
    Promise.any(promises).then(res => {
      resolve(res)
    }).catch(err => {
      const allEqual = arr => arr.every(val => val === arr[0]);
      Promise.allSettled(promises).then(res => {
        let reasons = res.map(function (value) { return value.reason })
        console.log(reasons)
        if (allEqual(reasons) && reasons[0] == "Worker fee is too high") {
          showAlert("Workers fee is too high!", "img/alert.png", "Your Max Fee is less than the worker fee. You can ajust a new fee if you want", "popup('showAlert'); elScroll('.feeSlider', 100); ")
          reject({ fail: "Workers fee is too high" })
        } else if (allEqual(reasons) && reasons[0] == "insufficient funds") {
          showAlert("Insufficient funds!", "img/alert.png", "You have not sufficient balance. Make a small deposit.", "popup('showAlert'); popup('showAccount')")
          reject({ fail: "insufficient funds" })
        } else if (alertPopup) {
          showAlert("Ops!", "img/alert.png", reasons.join("\n<br>"), "popup('showAlert'); popup('showAccount')")
        }
      })
      reject(err)
    })
    await Promise.allSettled(promises)
      .then(res => resolve(res))
      .catch(err => reject(err))
  })
}

async function receiveAll() {

  const useCompetition = async function () {
    for (let block in wallet.pending) {
      pending_block_hash = block
      await testAllWorkers()
      await sleep(1000) //a small gap for the animation completes
    }
  }

  const useWorker = async function (worker) {
    for (let block in wallet.pending) {
      pending_block_hash = block
      await testWorker(worker)
      await sleep(1000) //a small gap for the animation completes
    }
  }

  receivingAll = true

  elScroll("#workers", 100)
  overlay(".worker.online", ".testButton")
  $('.worker.online').one("click", function () {
    overlay(".worker.online", ".testButton")
    useWorker(this.dataset.ip)
    receivingAll = false
  });
  $('.competitionButton').one("click", function () {
    overlay(".worker.online", ".testButton")
    useCompetition()
    receivingAll = false
  });
}

/********* Wallet functions *********/
function showWallet() {
  $('.create-wallet').html('<small>' + wallet.address + '</small>')
  $('.deposit').show("slow")
  $('#showAccount .nano_account').textSlow(wallet.address)
  $('#showAccount .URI').attr('href', 'nano:' + wallet.address)
  qrCodeCreate(wallet.address, '.qr_code')
  $('#showSettings .option button').removeAttr("disabled");
  $('#showSettings .option button').removeClass("disabled");
}

function saveSending() {
  let destination = $("#editSending .default_destination").val()
  let amount = $("#editSending .default_amount").val()
  if (!checkNanoAddress(destination)) return alert("Invalid Destination Account!")
  if (isNaN(toRaws(amount))) return alert("Invalid Nano Amount!")
  if (amount != wallet.amount) setAmount(toRaws(amount))
  if (destination != wallet.destination) changeDestination(destination)
  popup('editSending')
}

function changeDestination(destination) {
  changed_destination = true
  setDestination(destination)
}

function setDestination(destination) {
  wallet.destination = destination
  wallet.link = parseNanoAddress(destination).publicKey
  $(".nano-bar .sendingTo").html('<small>' + abbrevNanoAddress(destination) + '</small>')
  $("#editSending .default_destination").val(destination)
}

function setAmount(amount) {
  wallet.amount = amount
  $(".nano-bar .sendingAmount").text(toMegaNano(amount))
  $("#editSending .default_amount").val(toMegaNano(amount))
}

function setWallet(seed, index) {
  const key_pair = deriveKeyPair(seed, index)
  console.log(key_pair)
  wallet.seed = seed
  wallet.index = 0
  wallet.secret = key_pair.secret
  wallet.publicKey = key_pair.publicKey
  wallet.address = key_pair.address
  if (!changed_destination) setDestination(wallet.address)
  console.info(wallet.address)
}

function createWallet() {
  const seed = createRandomSeed()
  setWallet(seed, 0)
  showWallet()
  loadPendingTransactions_loop()
}

async function importWallet(seed, index = 0) {
  setWallet(seed, index)
  showWallet()
  readWallet()
}

function updateBalance() {
  $(".nano-bar .balance_pending").textSlow(toMegaNano(wallet.balancePending))
  $(".nano-bar .balance").textSlow(toMegaNano(wallet.balance))
  $("#showAccount .balance_pending").textSlow(toMegaNano(wallet.balancePending))
  $("#showAccount .balance").textSlow(toMegaNano(wallet.balance))
}

function awaitNewAccount() {
  overlay(".nano-bar")
  $(".create-wallet").addClass("blink")
  $('.create-wallet').one("click", function () {
    overlay(".nano-bar")
    $(".create-wallet").removeClass("blink")
  });
}

function clickReceive(hash, amount) {
  pending_block_hash = hash
  popup("showAccount")
  elScroll("#workers", 100)
  overlay(".worker.online", ".testButton")
  $('.worker.online').one("click", function () {
    if (pending_block_hash == hash) overlay(".worker.online", ".testButton")
  });
  $('.competitionButton').one("click", function () {
    if (pending_block_hash == hash) overlay(".worker.online", ".testButton")
  });
}

async function loadPendingTransactions() {
  let pending_blocks = await P2PoW.pending_transactions(wallet.address, 1)
  for (let block in pending_blocks) {
    if (!(block in wallet.pending)) {
      wallet.pending[block] = await P2PoW.block_info(block)
      wallet.balancePending = BigNumber(wallet.balancePending).plus(wallet.pending[block].amount).toString(10)
      console.log("Received " + wallet.pending[block].amount + " from " + wallet.pending[block].account + ". Block: " + wallet.pending[block].hash)
      $(".nano-bar .balance_pending").textSlow(toMegaNano(wallet.balancePending))
      $('#showAccount .balance_pending').textSlow(toMegaNano(wallet.balancePending))
      $('#showAccount .pending_transactions').prepend('<li id="' + 'block_' + wallet.pending[block].hash + '" class="transaction" onclick=clickReceive(\'' + wallet.pending[block].hash + '\',\'' + wallet.pending[block].amount + '\') style="display: none"><strong>Block: </strong>' + abbrevNanoAddress(wallet.pending[block].hash) + '<br><strong>Amount: </strong>' + toMegaNano(wallet.pending[block].amount) + ' Nano<br><strong>From</strong>: ' + abbrevNanoAddress(wallet.pending[block].account) + '</li>')
      $('#block_' + wallet.pending[block].hash).fadeIn()
      if (Object.keys(wallet.pending).length > 1) $(".button-receiveAll").fadeIn()
    }
  }
}

async function loadPendingTransactions_loop() {
  while (true) {
    await loadPendingTransactions()
    await sleep(1000)
  }
}

function expandQR() {
  if ($('.expandQR').length) {
    $('.qr_code').removeClass('expandQR')
    $('.qr_code').css('z-index', 1);
    $('.overlay[data-overlay=".qr_code"]').remove()
  } else {
    $('.qr_code').addClass('expandQR')
    zIndex = highestZindex("#showAccount div")
    $('#showAccount').append('<div class="overlay active" data-overlay=".qr_code" style="z-index: ' + (zIndex + 1) + '"></div>')
    $('.qr_code').css('z-index', (zIndex + 2));
  }
}

function showExportWallet() {
  popup("exportWallet")
  const jsonAccount = { seed: wallet.seed, account: wallet.address, secret: wallet.secret, index: 0 }
  $("#exportWallet .json").textSlow(JSON.stringify(jsonAccount, null, 2))
}

function exportWallet() {
  const jsonAccount = { seed: wallet.seed, account: wallet.address, secret: wallet.secret, index: 0, info: "https://github.com/anarkrypto/p2pow/demo" }
  download("P2PoW-Wallet.json", JSON.stringify(jsonAccount, null, 2))
}

function showSeed() {
  popup("showSeed")
  $('#showSeed .seed').textSlow(wallet.seed)
}

async function copySeed() {
  copyToClipboard(wallet.seed)
  $('#showSeed button.bottom').text("Copied")
  await sleep(1000)
  $('#showSeed button.bottom').textSlow("Copy")
}

function synchronizeWallet() {
  return new Promise((resolve, reject) => {
    let promises = []
    promises.push(
      P2PoW.account_balance(wallet.address).then(res => {
        wallet.balance = res.balance
      }).catch(err => {
        reject(err)
      })
    )
    promises.push(
      P2PoW.account_frontier(wallet.address).then(frontier => {
        wallet.previous = frontier
      }).catch(err => {
        reject(err)
      })
    )
    Promise.all(promises).then(() => {
      resolve()
    })
  })
}

async function readWallet() {
  await synchronizeWallet()
  updateBalance()
  await loadPendingTransactions()
  await sleep(1000)
  loadPendingTransactions_loop()
}

function finishImportWalletPopup() {
  popup("importWallet")
  $("#importWallet .importText .validate").removeClass("valid")
  $("#importWallet .importFile .validate").removeClass("valid")
  $("#importWallet button.bottom").attr("disabled")
  $("#importWallet button.bottom").addClass("disabled")
  $("#importWallet #inputFile").removeAttr('disabled', 'disabled');
  $("#importWallet .inputText").removeAttr('disabled', 'disabled');
}

function importWalletFile(file) {
  return new Promise((resolve, reject) => {
    let fr = new FileReader(), index = 0;
    fr.onload = function () {
      if (!isJson(fr.result)) return reject("Not JSON file")
      const jsonData = JSON.parse(fr.result)
      if (!('seed' in jsonData)) return reject("Seed Not Found")
      if (!checkKey(jsonData.seed.toUpperCase())) return reject("Invalid Seed")
      if ("index" in jsonData) {
        if (checkIndex(jsonData.index)) {
          index = parseInt(jsonData.index)
        } else {
          return reject("Invalid index")
        }
      }
      resolve({ seed: jsonData.seed.toUpperCase(), index: index })
    }
    fr.readAsText(file);
  })
}

function listenImportSeed() {
  $("#importWallet .inputText").on('input', function () {
    const seed = $("#importWallet .inputText").val().toUpperCase()
    if (checkKey(seed)) {
      $("#importWallet .importText .validate").removeClass("invalid")
      $("#importWallet .importText .validate").addClass("valid")
      $("#importWallet button.bottom").attr("onclick", "importWallet('" + seed.toUpperCase() + "'); finishImportWalletPopup();")
      $("#importWallet button.bottom").removeAttr("disabled")
      $("#importWallet button.bottom").removeClass("disabled")
      $("#importWallet #inputFile").attr('disabled', 'disabled');
    } else {
      $("#importWallet .importText .validate").removeClass("valid")
      $("#importWallet .importText .validate").addClass("invalid")
      $("#importWallet button.bottom").attr("disabled")
      $("#importWallet button.bottom").addClass("disabled")
      $("#importWallet #inputFile").removeAttr('disabled', 'disabled');
    }
  });
  $("#importWallet #inputFile").on('change', function () {
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      alert('The File APIs are not fully supported in this browser.');
    } else if (!$("#importWallet #inputFile").prop('files')) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
    } else if (!$("#importWallet #inputFile").prop('files')[0]) {
      alert("Please select a file before clicking 'Load'");
    } else {
      const file = $("#importWallet #inputFile").prop('files')[0];
      importWalletFile(file)
        .then(res => {
          $("#importWallet .importFile .validate").removeClass("invalid")
          $("#importWallet .importFile .validate").addClass("valid")
          $("#importWallet button.bottom").attr("onclick", "importWallet('" + res.seed + "', " + res.index + "); finishImportWalletPopup();")
          $("#importWallet button.bottom").removeAttr("disabled")
          $("#importWallet button.bottom").removeClass("disabled")
          $("#importWallet .inputText").attr('disabled', 'disabled')
          $("#importWallet .importFile .errorMessage").text("")
        })
        .catch(err => {
          $("#importWallet .importFile .validate").removeClass("valid")
          $("#importWallet .importFile .validate").addClass("invalid")
          $("#importWallet button.bottom").attr("disabled")
          $("#importWallet button.bottom").addClass("disabled")
          $("#importWallet .inputText").removeAttr('disabled', 'disabled')
          $("#importWallet .importFile .errorMessage").text(err)
        })
    }
  })
}

/********* Check *********/
function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function checkURL(str) {
  var a = document.createElement('a');
  a.href = str;
  return (a.host && a.host != window.location.host);
}

function checkPort(port) {
  if (isNaN(port)) return false
  if (port < 0 || port > 65535) return false
  return true
}

/********* Utils *********/
function toMegaNano(raws) {
  let megaNano
  if (raws == 0) return 0
  if ((raws.toString().length - 30) > 0) {
    megaNano = raws.toString().substr(0, raws.toString().length - 30)
    fraction = raws.toString().substr(raws.toString().length - 30, raws.toString().length - (raws.toString().length - 30))
    if (fraction.length && parseInt(fraction) != 0) megaNano += fraction
  } else {
    megaNano = "0." + "0".repeat(30 - raws.toString().length) + raws
  }
  while (megaNano[megaNano.length - 1] == '0') {
    megaNano = megaNano.substr(0, megaNano.length - 1)
  }
  return megaNano
}

function toRaws(meganano) {
  return BigNumber("1000000000000000000000000000000").multipliedBy(meganano).toString(10)
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function copyToClipboard(str) {
  $('body').append('<input type="text" value="' + str + '" id="tempInput">')
  var copyText = document.getElementById("tempInput");
  copyText.select();
  copyText.setSelectionRange(0, 99999)
  document.execCommand("copy");
  $('#tempInput').remove()
  console.log("Copied the text: " + copyText.value);
}

function qrCodeCreate(address, el) {
  var typeNumber = 6;
  var errorCorrectionLevel = 'L';
  var qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData("nano:" + address);
  qr.make();
  document.querySelector(el).innerHTML = qr.createImgTag();
}

function highestZindex(els) {
  var index_highest = 0;
  $(els).each(function () {
    var index_current = parseInt($(this).css("zIndex"), 10);
    if (index_current > index_highest) {
      index_highest = index_current;
    }
  });
  return index_highest
}

function popup(div) {
  if ($('#' + div).hasClass("active")) {
    $('#' + div).removeClass("active")
    $('#' + div).css('z-index', -1);
  } else {
    zIndex = highestZindex("div") + 1
    $('#' + div).css('z-index', + zIndex);
    $('#' + div).addClass("active")
    $('#' + div + " .content").select()
  }
}

function overlay(el, el2) {
  if ($('.overlay[data-overlay="' + el + '"]').length) {
    $(el).css('z-index', 1);
    if (el2) $(el2).css('z-index', 1);
    $('.overlay[data-overlay="' + el + '"]').remove()
  } else {
    const zIndex = highestZindex("div")
    $('body').append('<div class="overlay active" data-overlay="' + el + '" style="z-index: ' + (zIndex + 1) + '"></div>')
    $(el).css('z-index', (zIndex + 2));
    if (el2) $(el2).css('z-index', (zIndex + 2));
  }
}

function showAlert(title, image, message, action) {
  $('#showAlert .title').text(title)
  $('#showAlert .image').text(image)
  $('#showAlert .message').html(message)
  $('#showAlert .bottom').attr("onclick", action);
  popup("showAlert")
}

function elScroll(el, topHeight) {
  $('html, body').animate({
    scrollTop: $(el).offset().top - topHeight
  }, 1000)
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/********* Inicialization *********/
(function ($) {
  $.fn.textSlow = function (str) {
    $(this).fadeOut(function () {
      $(this).text(str).fadeIn();
    });
    return this;
  };
})(jQuery);

let alertPopup = false, pending_block_hash = false, changed_destination = false, workersActivated = [], receivingAll = false
let wallet = {
  seed: "",
  index: "",
  secret: "",
  publicKey: "",
  address: "",
  destination: "",
  link: "",
  amount: "10000000000000000000000000",
  sent: [],
  received: [],
  pending: [],
  balance: "0",
  balancePending: "0",
  previous: "0000000000000000000000000000000000000000000000000000000000000000",
}

$(document).ready(async function () {
  const configFile = "P2PoW_client_JS/config.json"
  P2PoW.importConfigFromFile(configFile)
    .then(res => {
      showMaxFee()
      listConfig()
      setAmount(wallet.amount)
      listWorkers()
      listenImportSeed()
    })
    .catch(err => {
      console.log("Invalid configuration in file: " + configFile + ". Error: " + err.fail)
      showAlert("Invalid Config!", "alert.png", "Invalid configuration in file: " + configFile + "<br>  Error: " + JSON.stringify(err.fail), "console.log('ok')")
    })
})