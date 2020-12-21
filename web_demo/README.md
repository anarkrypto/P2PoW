# P2PoW Web Demo

This application is completely **client-side** and runs directly in the browser. 

It offers a friendly interface allowing any user to test the P2PoW protocol, using online workers to validate their transactions.

The communication process with workers is done by the <a href="https://github.com/anarkrypto/P2PoW/tree/master/client_JS" target="_blank">P2PoW client JS</a> (compatible with NodeJS and browsers)

Try it now, P2PoW online web demo: <a href="http://demo.p2pow.online" target="_blank">http://demo.p2pow.online</a>

Preview:

<img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/p2pow-demo.gif?raw=true">


- All signatures are made on the client side.
- Block information, account balance and etc are obtained through RPC commands for a Nano node.
- You can create new wallets, export and import the seed
- You can deposit and withdraw any valor from / to any wallet
- You can test one worker at a time or select competition mode
- You can adjust the fee to suit your preference.

### HTTP Only
Due to the fact that P2PoW does not support ssl yet, the use of https is not recommended.

### Attention, be safe

This project aims only at demonstrating the P2PoW protocol.

It is not recommended to use it to send or receive large amounts of Nano.

With just **0.01 Nano** it is already possible to test the application several times

### Config

You can edit the settings via the file: <a href="https://github.com/anarkrypto/P2PoW/blob/master/web_demo/P2PoW_client_JS/config.json" target="_blank">P2PoW_client_JS/config.json</a>

Editable parameters

- **node**: The RPC address of a Nano node.
- **representative**: The Nano address of a representative. Will be used in your transactions
-  **maxFee**: Maximum fee on Nano raws that you want to pay for each job by default.
- **timeout**: Maximum time in milliseconds to wait for the proof of work to complete before returning an error.

It is not recommended to edit:

- **trackerAccount**: The Nano burn account where workers' registers are located
- **registrationCode**: Amount of Nano that corresponds to a worker record
- **servicePort**: Standard P2PoW port (7090)
- **supportedVersions**: API versions that this client supports.

