# P2PoW API
Worker API for P2PoW (delegated Proof of Work), Nano cryptocurrency

## Current Version
2.0.0

## Configuring your Worker API
First you will need to have a <strong>Nano node >= v.19.0</strong> installed and synchronized.
- Edit the worker_config.json file. Enter:
	- Your Nano Account where the rewards will be deposited. It must have a small amount of Nano as it will be used to register your network node within a transaction.
	- The Private Key of this account (attention, do not confuse with the master seed). Required to sign the decentralized registration transaction. Don't worry, the registration transaction signature is made directly from your computer and no one else will have access to your private keys.
	- Your preferred Representative
	- The Minimum Fee you prefer for each work, represented in mNano. Current suggestion: 0.0001
	- Your Node address with RPC port. Probably <strong>127.0.0.1:7076</strong> or <strong>[::1]:7076</strong>
	- Your Worker Node Address (can be the same as node).
	- Active Difficulty can be ignored for now, I recommend you leaving false
	- Max Multiplier will be the maximum PoW difficulty your worker will accept when using active difficulty in dynamic PoW
	- Host address for API listen. 0.0.0.0 to listen external IP addresses
	- API running Port. 7090 by default.
	Example:

<p></p>

```
    {
    	"reward_account": "nano_3k8it4efod5hw194axu1m483qee7pryfrfung9pyr8x9pysfpz1bothqmo1y",
	"private_key": "79E937E6A24B2ABC7DD3894F03BF62303BE8CBA936CBEC7CA3BACEC763AF3BB2",
	"representative": "nano_3x7cjioqahgs5ppheys6prpqtb4rdknked83chf97bot1unrbdkaux37t31b",
 	"fee": 0.0001,
	"node": "[::1]:7076",
	"worker": "[::1]:7076",
	"use_active_difficulty": false,
	"max_multiplier": 10.0,
	"listen": "0.0.0.0",
	"port": 7090
    }
```


## How to run

Install python dependencies:

```
pip3 install -r requirements.txt			
```
run:

```
python3 api.py
```
When starting you will have the following type of output:

<img src="https://raw.githubusercontent.com/anarkrypto/P2PoW/master/docs/screenshots/p2pow_v2.0.0_starting.png">


## How it works

The user requests Workers info at the endpoint worker_ip_address:7090/request_info
And get the following kind of answer:

```
     {				 
      	"fee": 100000000000000000000000000,
      	"max_multiplier":10.0,
      	"min_multiplier":1.0,
      	"reward_account":"nano_3k8it4efod5hw194axu1m483qee7pryfrfung9pyr8x9pysfpz1bothqmo1y",
      	"version":"1.0.0"
     }
```

This is the worker's reward address and his minimum fee per work (in raws).
This fee must be multiplied by the (number of transactions sent - transaction reward)

Then users will use this information to sign the worker reward block.


Users can request the PoW by calling the endpoint (/request_pow) sending a json data like the following one:

```
        curl -s --request POST --data '{
          "user_block": 
	  	{
          		"block_type": "state",
          		"account": "nano_1bca3mirn8aauzy5m5o984bfphsxsbwsixc47d535rkg75nbzd3w737n6iya",
          		"previous": "11B1CCBBD2CFDDF46D0DE6D96D447431940C79DC90EB4F10E8271CD1BBB43ABD",
          		"representative": "nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1",
          		"balance": "1999999999999999999997172",
          		"link": "F4D9B075403D7325A9F0775B7FFE2E9B7AE14936AA953388949E1751DD996007",
          		"link_as_account": "nano_3x8sp3tn1hdm6pnz1xtuhzz4x8utw76mfcno8g6bb9iqc9gskr191tq8eaat",
          		"signature": "69CAEA32BC8E9CF8E47CF4453493929C6BDC11373FD4C228FDBE11A5D76F32A4FF5CFC5D7AD33A67CF3AE9014434B39CDFE83BB9F5F2BF08F5ED0EFBC391870D"
          	},
        "reward_block": 
		{
          		"block_type": "state",
          		"account": "nano_1bca3mirn8aauzy5m5o984bfphsxsbwsixc47d535rkg75nbzd3w737n6iya",
          		"previous": "1BD2525DE8E4E439A50322A04C77031D3D0F747C53839F20DB3716DEFC6E2D4D",
          		"representative": "nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1",
          		"balance": "999999999999999999997172",
          		"link": "BABB6F016CA3B94DDFB978335610516FE6940B392524C5B76E81C62A73014294",
          		"link_as_account": "nano_3goufw1psaxsbqhuky3mcra74uz8ki7mkbb6rpupx1g87bsi4innftt4sckk",
          		"signature": "E40DD1FAB27161FF2DD73FAB20082A04F86632ECFC8FC60707D2B8221B1CFE7C3B01A8D718AC04C3F6F5EC764C8EBD9905CC756FE2DB381D81A0AC7D2A974D00"
          	}
      }' worker_address:7090/request_pow
```


The first block (user_block) is the user transaction. The second one (reward_block) is responsible for the payment of the worker.


If all goes well, the output by the worker API will look like this:

<img src="https://raw.githubusercontent.com/anarkrypto/P2PoW/master/docs/screenshots/p2pow_v2.0.0_request_work.png" />


If the request is successful, the client will receive a JSON like this:
```
    {
	"successful": {
		"user_block": {
			"hash": "CF49649CC122A8F746FA5C3D387CF369B6108ECDEB5A1E7CBBC4FA89458C8558",
			"work": "617fbbd063c9ac40"
		},
		"reward_block": {
			"hash": "1DA6A5E87D90F2F7CA24443410EE6F58B6834A0F53D1DD147716EE9E6F5AB9A5",
			"work": "fa65a4f7df46174f"
		}
	}
    }
```
Meaning that transactions have already been validated and transmitted over the Nano network.

The reward_block hash is the new previous block of the user's account


### Install as a service using systemd on Linux
#### Automatically booting P2PoW API with the system

1. Create a file /etc/systemd/system/p2pow.service: ``` sudo nano /etc/systemd/system/p2pow.service ```
2. Paste this:
```
    [Unit]
    Description=P2PoW Worker API
    After=network.target

    [Service]
    Type=forking
    ExecStart=/usr/bin/python3 /home/p2pow/worker_API/api.py --output /var/log/p2pow.log
    Restart=on-failure
    RestartSec=15 #wait 15sec before restart
    #User=nobody
    #Group=nogroup
    WorkingDirectory=/home/P2PoW/workerAPI
    Environment=PYTHONUNBUFFERED=1

    [Install]
    WantedBy=multi-user.target
```

**change /home/p2pow/ to your actual location of P2PoW**
and save (ctrl + s)

3. Make the file executable: ```sudo chmod +x /home/p2pow/worker_API/api.py```
4. Make systemd aware: ```sudo systemctl daemon-reload```
5. Test the service: ```sudo systemctl start p2pow```
6. Check status: ```sudo systemctl status p2pow```
7. Start service on boot: ```sudo systemctl enable p2pow.service```
8. Follow logs in realtime: ```sudo journalctl --follow -u p2pow```


## Decentralized Registration
Instead of a Nano-like peering system or protocols like torrent, this project introduced a new way for peers to exchange their IP addresses.
This API automatically saves the worker IP (ipv4 or ipv6) in a Nano transaction, after encoding to nano account format, and associates it with the default register account (1de1egated1proof1ofwork1themain1registration1accountp46rpyr6) as the destination.
That's why you need to put your account private key in worker_config.json and have a small balance there.


P2PoW client read the transaction history of the registration account. There they find the workers account. And in the workers account they will find their IP addresses, through which user<->worker P2P connections are made. The interesting thing about this system is that besides saving bandwidth and avoiding certain attacks, it avoids the need for main peers and also allows us to associate and recognize worker accounts.


## GPU
Although you can use your CPU for testing, if you want to be a worker it is recommended to use a good GPU, as in worker competition the best hardware solves PoW first.
For this you will need to have your GPU drivers properly installed and OpenCL. With this your node will use its GPU for PoWs.

### Donations
This project is developed in a totally independent way, you can encourage further development of this and other Nano projects with a donation:
**nano_18eoa1k16d4n1b5hb8hwxm5mmgp6zny7owhn8omc5bgxjahxsyznob9u536t**

<a href='nano:nano_18eoa1k16d4n1b5hb8hwxm5mmgp6zny7owhn8omc5bgxjahxsyznob9u536t'>
<img src="https://github.com/anarkrypto/P2PoW/blob/master/docs/donate-qr-code-gradient.png?raw=true" width="300px" />
</a>


### Discord Channel
If you have questions about the project, suggestions or other contributions you can join our channel **#p2pow-discussion** on The Nano Center's Discord server:
https://discord.gg/GhzdTkD
