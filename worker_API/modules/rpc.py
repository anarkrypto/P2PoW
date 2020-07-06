import requests
import json
from nanolib import Block, get_account_public_key
from modules.import_config import worker, register_config

timeout = 30

#Read transaction Block
def block_create(block_type, account, representative, previous, link, balance, signature):
    if "_" in link:
        link = get_account_public_key(account_id=link)
    try:
        block = Block(
            block_type=block_type,
            account=account,
            representative=representative,
            previous=previous,
            link=link,
            balance=int(balance),
        )
    except:
        return "invalid"
    else:
        if signature is not None:
            try:
                block.signature = signature
            except:
                return "invalid"
        return block

#account balance
def balance(account):
    request = requests.post(worker["node"], json={"action": "account_balance", "account": account})
    return int(request.json()['balance'])

#block info
def block_info(hash):
    request = requests.post(worker["node"], json={"action": "block_info", "json_block": "true", "hash": hash})
    return request.json()

#check last transaction
def check_history(account, destination):
    request = requests.post(worker["node"], json={"action": "account_history", "account": account, "count": 1, "raw": "true", "account_filter": [destination]})
    history = request.json()["history"]
    if (len(history)):
        return history[0]
    return (None)

#check if block already exists
def frontier(account):
     request = requests.post(worker["node"], json={"action": "accounts_frontiers", "accounts": [account]})
     if account in request.json()["frontiers"]:
        return request.json()["frontiers"][account]
     else:
        return "0000000000000000000000000000000000000000000000000000000000000000"

#active difficulty network
def get_difficulty():
     request = requests.post(worker["node"], json={"action": "active_difficulty", "include_trend": "true"})
     return float(request.json()["multiplier"])

#solve work
def solve_work (hash, multiplier):
    try:
         request = requests.post(worker["worker_node"], json={"action": "work_generate", "hash": hash, "multiplier": str(multiplier) })
         return request.json()
    except Exception as err:
        return {"error": str(err)}

#cancel work
def cancel_work (hash):
    try:
         request = requests.post(worker["worker_node"], json={"action": "work_cancel", "hash": hash })
         return request.json()
    except Exception as err:
        return {"error": err}

def validate_work (hash, work):
    try:
        request = requests.post(worker["worker_node"], json={"action": "work_validate", "hash": hash, "work": work})
    except:
        return {"error": "offline"}
    else:
        return request.json()

def node_version():
    try:
        request = requests.post(worker["node"], json={"action": "version"}, timeout=timeout)
    except:
        return {"error": "offline"}
    else:
        if "node_vendor" in request.json():
            return request.json()
        else:
            return {"error": "node_vendor not found"}

#broadcast transaction
def broadcast(transaction):
    try:
        request = requests.post(worker["node"], json={"action": "process", "json_block": "true", "block": json.loads(transaction)})
        return request.json()
    except Exception as err:
        return {"error": err}

#Find pending transactions and return those that complete the required amount.
def pending_filter (account, threshold, count):
    request = requests.post(worker["node"], json={"action": "pending", "account": account, "count": count, "threshold": threshold})
    blocks = request.json()["blocks"]
    if blocks != "":
        return blocks
    else: #if block hashes with amount more or equal to threshold not found, return a list of transactions containing such amount
        request = requests.post(worker["node"], json={"action": "pending", "account": account, "threshold": 1})
        blocks = request.json()["blocks"]
        if blocks == "":
            return None
        else:
            for key in blocks:
                    blocks[key] = int(blocks[key])
            sorted_blocks = dict(sorted(blocks.items(), key=lambda kv: kv[1], reverse=True))
            receive_blocks = {}; acumulated = 0
            for key in sorted_blocks:
                receive_blocks[key] = sorted_blocks[key]
                acumulated += sorted_blocks[key]
                if acumulated >= threshold:
                    return receive_blocks
            return None

#Receive pending transactions
def receive(account, private_key, representative, amount, link, difficulty):
    request = requests.post(worker["node"], json={"action": "accounts_frontiers", "accounts": [account]})
    previous = frontier(account)
    if previous == "0000000000000000000000000000000000000000000000000000000000000000":
        request = requests.post(worker["node"], json={ "action": "account_key", "account" : account })
        workHash = request.json()["key"]
    else:
        workHash = previous
    block = Block(
        block_type="state",
        account=account,
        representative=representative,
        previous=previous,
        balance=balance(worker["account"]) + amount,
        link=link
    )
    solveWork = solve_work(workHash, difficulty)
    if "error" in solveWork:
        return {"error": solveWork["error"]}
    block.work = solveWork["work"]
    block.sign(private_key)
    r = broadcast(block.json())
    return r

#Send transactions (Used in the registration process)
def send (account, representative, previous, link_as_account, amount, difficulty):
    block = block_create("state", account, representative, previous, link_as_account, balance(worker["account"]) - amount, None)
    block.sign(worker["private_key"])
    solveWork = solve_work(block.previous, difficulty)
    if "error" in solveWork:
        return {"error": str(solveWork["error"])}
    block.work = solveWork["work"]
    r = broadcast(block.json())
    return r
