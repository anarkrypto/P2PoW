# Nano P2PoW
A P2P Delegated Proof of Work solution for <a href="https://nano.org/" target="_blank">Nano cryptocurrency</a>

Trustless, serverless, open-source

<p align="center"><img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/github-images/p2pow_logo.png?raw=true" width="240px"></p>

### Introduction
This project has the ability to make Nano instantaneous for any type of low computing device by delegating PoW to Workers on a P2P network, requiring no central servers / coordinators.

P2PoW is the rebranding of Delegated PoW, created by me, Anarkrypto, in October 2019 and <a href="https://medium.com/snapy-io/nano-jam-one-concludes-7ea7b35418a9" target="_blank">winner of NanoJam</a> - first hackaton involving the Nano cryptocurrency.

P2PoW rewards "workers nodes" providing computing resources to Nano users in exchange for a small fee. Using Nano's DAG technology, it was possible to create a safe mechanism where neither party can be dishonest. This eliminates any need for central coordinator / authority in the process.

The only way a user can have their transaction validated by Worker is to attach an extra transaction block as a reward after their transactions. The only way for a Worker to receive his reward is by completing PoW and broadcasting the user's transaction first to be able to validate his reward block. Read more <a href="https://medium.com/@anarkrypto/delegated-proof-of-work-d566870924d9" target="_blank">in this Medium article</a>

## P2PoW Resources

### P2PoW API:
<p align="center"><img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/github-images/api.png?raw=true" width="200px"></p>
worker API is a node-like software that those interested in providing proof of work for users should run.

It register the worker's IP in the tracker account to be found by users.<br>
Then it provides an API that receives proof of work requests, verifies the validity and, if all is well, solves the PoW and broadcast the user_block and reward_block to the network, receiving a reward in return.

- Prog Language: Python
- Current Version: 2.0.0
- Code and instructions: https://github.com/anarkrypto/P2PoW/tree/master/worker_API


### P2PoW Client
<p align="center"><img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/github-images/client.png?raw=true" width="200px"></p>

This client offers the best way to communicate with workers running the P2PoW API and was developed to facilitate the implementation of the P2PoW protocol in apps and websites:

<p align="center">App Intercace <-> Client JS <-> Workers API</p>

All signatures are made on the client side. Block information, account balance and etc are obtained through RPC commands for a Nano node.

Compatible with node.js and major browsers

Proof of work can be requested in a simple way
```js
P2PoW.requestWork(user_block, callback)
  .then(res => {
          console.info("P2PoW successfully! Your Block: " + res.user_block.hash)
  })
  .catch (err => {
          console.error("All workers fail: " + err.fail)
  })
```

- Prog. Language: Javascript (JS)
- Current Version: 1.0.0
- Code and instructions: https://github.com/anarkrypto/P2PoW/tree/master/client_JS


### P2PoW Web Demo

This application runs directly in the browser and contains the main functions of a Nano wallet

It offers a friendly interface allowing any user to test the P2PoW protocol, using online workers to validate their transactions.

The communication process with workers is done by the P2PoW client JS

Try it now, P2PoW online web demo: <a href="http://demo.p2pow.online" target="_blank">http://demo.p2pow.online</a>

Preview:

<img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/p2pow-demo.gif?raw=true">

- Prog. Language: Javascript, HTML, CSS
- Current Version: 1.0.0
- Code and instructions: https://github.com/anarkrypto/P2PoW/tree/master/web_demo
- Online Demo: http://demo.p2pow.online


<br>

### Donations
This project is developed in a totally independent way, you can encourage further development of this and other Nano projects with a donation:

<p align="center">
<img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/donate-qr-code-gradient.png?raw=true" width="300px" />
</p>


<p align="center">
 nano_18eoa1k16d4n1b5hb8hwxm5mmgp6zny7owhn8omc5bgxjahxsyznob9u536t
 </p>

### Discord Channel
If you have questions about the project, suggestions or other contributions you can join our channel **#p2pow-discussion** on The Nano Center's Discord server:
https://discord.gg/GhzdTkD

