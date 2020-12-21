## P2PoW Client JS
This client offers the best way to communicate with workers running the P2PoW API.
<br>All signatures are made on the client side.
<br>Block information and account balance are obtained through RPC commands for a Nano node.
<br>Compatible with node.js and major browsers 

### Current Version
1.0.0

### nodeJS:

#### Installing dependencies:
```bash
npm i fetch
```

#### Importing:
```js
const P2PoW = require('./P2PoW.js')
```


### Browsers:
```javascript
  <!-- P2PoW Dependencies -->
  <script type="text/javascript" src="./client_JS/nano_utils/bignumber.min.js"></script>
  <script type="text/javascript" src="./client_JS/nano_utils/blake2b.js"></script>
  <script type="text/javascript" src="./client_JS/nano_utils/nacl.js"></script>
  
  <!-- P2PoW Client -->
  <script type="text/javascript" src="/client_JS/P2PoW.js"></script>
```

### Initializing
The first step is to import the configuration via a file or pass it through an object (P2PoW.importConfig).
<br>Example configuration file: <a href="https://github.com/anarkrypto/P2PoW/blob/master/client_JS/config.json">config.json</a>

Then we start the synchronization process, which will return the first result and then continue updating in the background loop.
<br>This process is important to keep the list of registered workers updated, online workers with their accounts and fees updated

```javascript
//Import Config
await P2PoW.importConfigFromFile("./config.json")
  .catch(err => {
    console.error("Failed to attempt to import the configuration file. Error: " + err.fail) 
  })

//Syncs with all registered and updates every 30 seconds
P2PoW.sync(30000, callbackFunction)
  .then(all_workers => {
     console.log("Found " + Object.keys(all_workers.registered).length + " workers registrations")
     console.log("Found " + Object.keys(all_workers.online).length + " workers online")
  })
  .catch(err => {
      console.error("Sync failed. Error: " + err.fail) 
  })

```

### Requesting proof of work
You send your transaction data. 
<br>For each worker online with a fee lower than or equal the maximum fee, a reward transaction will be created, signed and broadcasted.
<br>Whoever finishes first wins the reward.

```javascript
P2PoW.requestWork(
   {
      type: "send", //send, receive or change
      account: myWallet.account, //your Nano account
      link_as_account: destination_account, //to receive use "link" and hash of the block to receive
      balance: balance_final, //balance actual - amount sending
      previous: myWallet.previous, //your current frontier
      representative: P2PoW.config.representative,
      workers: Object.keys(P2PoW.workersOnline), //or you can choose a specific worker
      maxFee: P2PoW.config.maxFee, //maximum raw fee
      secret: myWallet.secret //the private key (not seed) of your Nano account to sign transactions
    },
    callbackFunction
)
  .then(res => {
          console.info("P2PoW successfully! Your Block: " + res.user_block.hash)
          if (res.reward_block.hash != "unknown") console.info ("Reward Block: " + res.reward_block.hash) //your new previous block (frontier)
  })
  .catch (err => {
          console.error("All workers fail: " + err.fail)
  })
```

### Other functions


```diff
+ P2PoW Utils:

```

**P2PoW.importConfig (** config_object **)**: Imports configuration through an object

**P2PoW.getworkersRegisters (** callbackFunction **)**: Updates and returns all worker records found in the tracker / registration account

**P2PoW.getWorkersOnline (** workers_ip_array, callbackFunction **)**: Updates and returns all registered workers who are online

**P2PoW.requestInfo (** worker_ip **)**: Requests information from a worker (fee, reward_account, etc.) 

**P2PoW.ipAddressInNanoAccount (** worker_account **)**,


```diff
+ RPC and Checks Utils:
```

**P2PoW.checkNanoAddress (** nano_account **)**: Validates a Nano address (true or false)

**P2PoW.checkAmount (** amount_in_raws **)**: Validates a Nano amount in raws (true or false)

**P2PoW.account_balance (** nano_account **)**: Returns balance and pending values

**P2PoW.account_frontier (** nano_account **)**: Returns the previous block

**P2PoW.pending_transactions (** nano_account **)**: Returns all pending blocks for an account

**P2PoW.block_info (** block_hash **)**: Block information


```diff
+ P2PoW globals:
```

**P2PoW.config***: Object containing the current config

**P2PoW.workersRegisters**: Object containing all worker records found in the tracker / registration account

**P2PoW.workersOnline**: Object containing all workers online and their info

<br><br>

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


