import json, requests, ipaddress
from nanolib import get_account_id
from modules.logger import app_log
import modules.rpc as rpc
from modules.import_config import worker, register_config

#Get external IPv4 or IPv6
def get_my_ip():
    myIP = requests.get(register_config["get_ip"])
    return myIP.text

#encode IPv4 or IPv6 into Nano Account format
def encode_ip (ip):
    def int_to_bytes(x: int) -> bytes:
        return x.to_bytes((x.bit_length() + 7) // 8, 'big')
    try:
        ip_as_bytes = int_to_bytes(int(ipaddress.IPv4Address(ip))) #convert ipv4 to bytes
    except:
        try:
            ip_as_bytes = int_to_bytes(int(ipaddress.IPv6Address(ip))) #convert ipv6 to bytes
        except:
            return "Invalid IP Address"
    ip_as_bytes += (32 - len(ip_as_bytes)) * b'\0' #padding to 32 bytes
    ip_account =  get_account_id(public_key=ip_as_bytes.hex(), prefix="nano_") ##convert to nano account format
    return ip_account


    #Registration Function. This process uses Nano transactions to save worker IP and account and associate it with the main registration account
def register_worker (account, previous, ip_account, multiplier):
    if rpc.balance(account) >= register_config["register_code"]:
        app_log.info ("You have sufficient funds to register your worker address")
        app_log.info ("Registering worker account with your current IP")
        r = rpc.send(account, ip_account, previous, register_config["account"], register_config["register_code"])
    else:
        app_log.info ("Insufficient funds, checking for unpocketed transactions...")
        pending = rpc.pending_filter(account, register_config["register_code"], 1)
        if pending == None:
            app_log.warning ("You have not sufficient funds to register your worker address! Please send at least " + str(register_config["register_code"]) + " raws to your worker account")
            return False
        else:
            for block in pending:
                app_log.info ("Receiving pending block: " + str(pending[block]) + " raws")
                r = rpc.receive(account, worker["private_key"], worker["representative"], int(pending[block]), block)
                if 'hash' in r:
                    app_log.info ("Transaction received!" + "! Block: " + r["hash"])
                else:
                    app_log.error ("Transaction receiving fail. Details: " + json.dumps(r))
                    return False
            app_log.info ("Ok, registering worker now")
            r = rpc.send(account, ip_account, rpc.frontier(account), register_config["account"], multiplier, '1.0')
    if 'hash' in r:
        app_log.info ("Successfully registred worker! Block: " + r["hash"])
    else:
        app_log.error ("Register transaction fail. Details: " + json.dumps(r))
        return False

#check if worker is registered
def check_worker_register():
    app_log.info ("Checking register...")
    history = rpc.check_history(worker["account"], register_config["account"])
    myIP = get_my_ip() #check IP register
    ip_account = encode_ip(myIP)
    if history is not None:
        if int(history["amount"]) == register_config["register_code"]:
            app_log.info ("Found your worker account registration: " + worker["account"])
            if ip_account == history["representative"]:
                app_log.info ("Found your actuall IP address registration: " + myIP)
            else:
                app_log.info ("Not found your actuall IP address registration: " + myIP)
                try_r  = register_worker (worker["account"], rpc.frontier(worker["account"]), ip_account, 1.0)
                if (try_r is False):
                    app_log.error ("Registration failed")
                    quit()
        else:
            app_log.info ("Incorrect amount in register")
            try_r  = register_worker (worker["account"], rpc.frontier(worker["account"]), ip_account, 1.0)
            if (try_r is False):
                app_log.error ("Registration failed")
                quit()
    else:
        app_log.info ("Not found your worker registration: " + worker["account"])
        try_r = register_worker (worker["account"], rpc.frontier(worker["account"]), ip_account, 1.0)
        if (try_r is False):
            app_log.error ("Registration failed")
            quit()