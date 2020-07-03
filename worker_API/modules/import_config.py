import json
from nanolib import get_account_key_pair, validate_account_id, validate_private_key, get_account_id
from decimal import *
from modules.logger import app_log

#Convert IP address to valid url format
def toURL(address):
    if not address.startswith("http"):
        return "http://" + address
    else:
        return address

#Convert Mega Nano to raws
def toRaws(megaNano):
    getcontext().prec = 39
    r = Decimal('1000000000000000000000000000000') * Decimal(megaNano)
    raws = int(str(r).split('.')[0])
    return raws

def importConfig():
    #get worker api config
    try:
        with open('config/worker_config.json') as worker_config:
            data = json.load(worker_config)
        worker = {
            "account": data['reward_account'].replace("xrb_", "nano_"),
            "private_key": data['private_key'].upper(),
            "public_key": get_account_key_pair(data['private_key']).public.upper(),
            "representative": data['representative'].replace("xrb_", "nano_"),
            "fee": data['fee'],
            "node": toURL(data['node']),
            "worker_node": toURL(data['worker']),
            "use_active_difficulty": data['use_active_difficulty'],
            "max_multiplier": data['max_multiplier'],
            "service_listen": data['listen'],
            "service_port": data['port'],
        }
        worker["fee"] = toRaws(str(worker["fee"])) #convert mNano fee to raws
    except Exception as e:
        raise Exception ("worker_config.json error: " + str(e))

    #Get worker registration config
    try:
        with open('config/register_config.json') as register_config:
            data_register = json.load(register_config)
        register_config = {
            "account": data_register['registration_account'].replace("xrb_", "nano_"),
            "register_code": int(data_register['register_code']),
            "get_ip": toURL(data_register['get_ip'])
        }
    except Exception as e:
        raise Exception ("worker_config.json error: " + str(err))

    #Check config file
    try:
        validate_account_id(worker["account"])
        validate_private_key(worker["private_key"])
        validate_account_id(worker["representative"])
    except Exception as e:
        raise Exception ("Invalid config in worker_config.json found! Details: " + str(e))

    #Check config file
    try:
        validate_account_id(register_config["account"])
    except Exception as e:
        raise Exception ("Invalid config in register_config.json found! Details: " + str(e))

    #Check if key pair is valid
    if worker["account"] != get_account_id(private_key=worker["private_key"], prefix="nano_"):
        raise Exception ("Invalid key pair")

    return {"worker_config": worker, "register_config": register_config}

#worker api config
worker = {}
register_config = {}
try:
    importingConfig = importConfig()
    worker = importingConfig["worker_config"]
    register_config = importingConfig["register_config"]
    app_log.info ("Configurations okay")
except Exception as err:
    app_log.error(err)
    quit()
