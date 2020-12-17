import json, nanolib
from modules.logger import app_log
from modules.utils import to_raws, to_url, ip_version

def importConfig():
    #get worker api config
    try:
        with open('config/worker_config.json') as worker_config:
            data = json.load(worker_config)
        worker = {
            "account": data['reward_account'].replace("xrb_", "nano_"),
            "private_key": data['private_key'].upper(),
            "public_key": nanolib.get_account_key_pair(data['private_key']).public.upper(),
            "representative": data['representative'].replace("xrb_", "nano_"),
            "default_fee": data['fee'],
            "node": to_url(data['node']),
            "worker_node": to_url(data['worker']),
            "max_multiplier": data['max_multiplier'],
            "use_dynamic_pow": data['use_dynamic_pow'],
            "use_dynamic_fee": data['use_dynamic_fee'],
            "dynamic_pow_interval": data['dynamic_pow_interval'],
            "show_network_difficulty": data['show_network_difficulty'],
            "service_listen": data['listen'],
            "service_port": data['port'],
        }
        worker["default_fee"] = to_raws(str(worker["default_fee"])) #convert mNano fee to raws
    except Exception as err:
        raise Exception ("worker_config.json error: " + str(err))

    #Get worker registration config
    try:
        with open('config/register_config.json') as register_config:
            data_register = json.load(register_config)
        register_config = {
            "account": data_register['registration_account'].replace("xrb_", "nano_"),
            "register_code": int(data_register['register_code']),
            "get_ip": {"ipv4": to_url(data_register['get_ip']['ipv4']), "ipv6": to_url(data_register['get_ip']['ipv6'])},
            "default_ip_version": ip_version(data_register['default_ip_version'])
        }
    except Exception as err:
        raise Exception ("worker_config.json error: " + str(err))

    #Check config file
    try:
        nanolib.validate_account_id(worker["account"])
        nanolib.validate_private_key(worker["private_key"])
        nanolib.validate_account_id(worker["representative"])
    except Exception as e:
        raise Exception ("Invalid config in worker_config.json found! Details: " + str(e))

    #Check config file
    try:
        nanolib.validate_account_id(register_config["account"])
    except Exception as e:
        raise Exception ("Invalid config in register_config.json found! Details: " + str(e))

    #Check if key pair is valid
    if worker["account"] != nanolib.get_account_id(private_key=worker["private_key"], prefix="nano_"):
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
