import time, json, requests, waitress
from threading import Thread
from flask_cors import CORS
from flask import Flask, request, jsonify
import modules.rpc as rpc
import modules.init as init
from modules.logger import app_log
from modules.import_config import worker, register_config
from modules.utils import block_create, current_milli_time, to_mega_nano

#Setup our API server
app = Flask(__name__)
CORS(app)
timeout = 30

#response json with http code
def responseAPI(res, code):
    return app.response_class(response=json.dumps(res),
                                  status=code,
                                  mimetype='application/json')

#handler 404 error
@app.errorhandler(404) 
def invalid_route(e): 
    return responseAPI({
        "error": "Invalid Route",
        "validRoutes": ["/request_info", "/request_work"],
        "moreInfo": "https://github.com/anarkrypto/P2PoW/worker_API"
    }, 404)

#Listen /request_info
@app.route('/request_info', methods=['GET', 'POST'])
def request_info():
    app_log.info ("Requested Info")
    info = {
        "version": "2.0.0",
        "reward_account": worker["account"],
        "fee": str(worker["fee"]),
        "fee_receive": str(worker["fee_receive"]),
        "min_multiplier": worker["multiplier"],
        "max_multiplier": worker["max_multiplier"],
        "last_update": init.active_difficulty["last_update"],
        "dynamic_fee": False,
        "status": "available"
    }
    if worker["show_network_difficulty"] == True:
        info["network"] = {
            "minimum": init.active_difficulty["network_minimum"],
            "minimum_receive_minimum": init.active_difficulty["network_receive_minimum"],
            "current": init.active_difficulty["network_current"],
            "receive_current": init.active_difficulty["network_receive_current"],
            "multiplier": init.active_difficulty["multiplier"]
        }
    if worker["use_dynamic_fee"] == True:
        info["dynamic_fee"] = worker["dynamic_pow_interval"]
    if (float(init.active_difficulty["multiplier"]) > worker["max_multiplier"]):
        info["status"] = "unavailable",
        info["error"] = "Current network difficulty exceded maximum difficulty allowed",
        info["retryAfter"] = init.when_next_active_difficulty() / 1000
    return responseAPI(info, 200)

#Listen /request_work
@app.route('/request_work', methods=['GET', 'POST'])
def request_work():

    app_log.info ("Requested Work")

    #start time count
    timeBefore = current_milli_time()

    #prevents works with greater difficulties than defined 
    if (float(init.active_difficulty["multiplier"]) > worker["max_multiplier"]):
        app_log.warning("Current network difficulty exceded maximum difficulty allowed")
        return responseAPI({
            "status": "unavailable",
            "error": "Current network difficulty exceded maximum difficulty allowed",
            "retryAfter": init.when_next_active_difficulty() / 1000
            }, 503)

    ### CHECK USER SENT DATA ###
    #check JSON
    try:
        user_data = request.get_json(force=True)
    except:
        app_log.warning ("Invalid request received")
        return responseAPI ({"error": "Invalid JSON"}, 400)

    #check if user transaction is present
    if "user_block" in user_data:
        user_transaction = user_data.get("user_block")
    else:
        app_log.warning ("User transaction missing")
        return responseAPI({"error": "User transaction missing"}, 400)

    #check if reward transation is present
    if "reward_block" in user_data:
        reward_transaction = user_data.get("reward_block")
    else:
        app_log.warning ("Reward transaction missing")
        return responseAPI({"error": "Reward transaction missing"}, 400)

    #Read transaction and check if is valid
    if "link" not in user_transaction:
        if "link_as_account" in user_transaction:
            user_transaction["link"] = user_transaction["link_as_account"]
        else:
            return responseAPI({"error": "Invalid user transaction"}, 400)
    if "link" not in reward_transaction:
        if "link_as_account" in reward_transaction:
            reward_transaction["link"] = reward_transaction["link_as_account"]
        else:
            app_log.warning ("Invalid user transaction")
            return responseAPI({"error": "Invalid Reward transaction"}, 400)

    #Builds the user and reward blocks and checks for invalid transaction data, such as invalid signature
    user_block = block_create("state", user_transaction.get('account').replace("xrb_", "nano_"), user_transaction.get('representative'), user_transaction.get('previous'), user_transaction.get("link").upper(), user_transaction.get('balance'), user_transaction.get("signature").upper())
    if user_block == "invalid":
        app_log.warning ("Invalid user transaction")
        return responseAPI({"error": "Invalid user transaction"}, 400)
    reward_block = block_create("state", reward_transaction.get('account').replace("xrb_", "nano_"), reward_transaction.get('representative'), reward_transaction.get('previous'), reward_transaction.get("link").upper(), reward_transaction.get('balance'), reward_transaction.get("signature").upper())
    if reward_block == "invalid":
        app_log.warning ("Invalid reward transaction")
        return responseAPI({"error": "Invalid reward transaction"}, 400)

    #If account source in both transactions is different
    if user_block.account != reward_block.account :
        app_log.warning ("Different source accounts ")
        return responseAPI({"error": "Different Accounts source"}, 400)

    #If worker account is wrong
    if reward_block.link != worker["public_key"]:
        app_log.warning ("Worker account is incorrect")
        return responseAPI({"error": "Worker account is incorrect"}, 400)

    #Check if previous block in worker hash is correct
    if reward_block.previous != user_block.block_hash:
        app_log.warning ("Incorrect previous block in worker block")
        return responseAPI({"error": "Incorrect previous block in worker block" }, 400)

    #Check if fee is right
    user_fee = user_block.balance - reward_block.balance
    if user_fee < worker["fee"] and user_fee < worker["fee_receive"]:
        app_log.warning ("Fee " + str(user_fee) + " is less than minimum")
        return responseAPI({"error": "Fee is less than minimum"}, 403)

    ### CHECK USER ACCOUNT STATE VIA NANO NODE RPC ###
    #Check previous block
    if rpc.frontier(user_block.account) == user_block.previous:
        app_log.info ("Block is valid: " + user_block.block_hash)
    else:
        app_log.warning ("Wrong previous block")
        return responseAPI({"error": "Wrong previous block"}, 400)

    #If user transaction is RECEIVE type, check if is valid (search in pending transactions)
    user_actualBalance = rpc.balance(user_block.account)
    user_receiveAmount = user_block.balance - user_actualBalance
    if  user_actualBalance < int(user_block.balance):
        user_pendings = rpc.pending_filter (user_block.account, user_receiveAmount, -1)
        if user_pendings != None and user_block.link in user_pendings and int(user_pendings[user_block.link]) == user_receiveAmount:
            app_log.info ("User receiving " + str(user_receiveAmount) + " raws")
            difficulty = worker["difficulty_receive"]
        else:
            app_log.warning ("Invalid receive transaction")
            return responseAPI({"error": "Invalid receive transaction"}, 403)
    else: #send type
           #Check if fee is right
            if user_fee < worker["fee"]:
                app_log.warning ("Fee " + str(user_fee) + " is less than minimum " + str(worker["fee"]))
                return responseAPI({"error": "Fee is less than minimum"}, 403)

            #If user transaction is SEND type, check if account source has sufficient funds for both transactions
            if rpc.balance(user_block.account) < int(reward_block.balance):
                app_log.warning ("Insufficient funds")
                return responseAPI({"error": "Insuficient funds"}, 403)
            else:
                app_log.info ("User sending: " + str(user_receiveAmount) + " raws")
                app_log.info ("Account has sufficient funds")
                difficulty = worker["difficulty"]

    #ALL IS RIGHT, SOLVE THE POW FOR BOTH TRANSACTIONS
    #If previous is zero sequences, proof of work is about the public key of the account
    if user_block.previous == "0000000000000000000000000000000000000000000000000000000000000000":
        r = requests.post(worker["node"], json={ "action": "account_key", "account" : user_block.account },  timeout=timeout)
        userWorkHash = r.json()["key"]
    else:
        userWorkHash = user_block.previous

    app_log.info ("Solving Works...")

    #If new transactions are found in the user's account history,
    # the transactions are invalidated and therefore the proof of work is canceled to avoid waste of processing.
    def checkAndCancel(stop):
        stopCheckAndCancel = False
        while stopCheckAndCancel == False:
            l_frontier = rpc.frontier(user_block.account)
            if l_frontier != user_block.previous and l_frontier != reward_block.previous and l_frontier != reward_block.block_hash:
                    app_log.warning ("User transaction found! Someone passed you!")
                    app_log.warning ("Canceling works...")
                    cancelWork = rpc.cancel_work(user_block.previous)
                    if "error" in cancelWork:
                        app_log.error("Error canceling user_block work: " + str(cancelWork["error"]))
                    cancelWork = rpc.cancel_work(reward_block.previous)
                    if "error" in cancelWork:
                        app_log.error("Error canceling user_block work: " + str(cancelWork["error"]))
                    stopCheckAndCancel = True
            time.sleep(0.2)
            if stop():
                break
    #start checkAndCancel loop
    stop_checkAndCancelThread = False
    checkAndCancelThread = Thread(target=checkAndCancel, args =(lambda : stop_checkAndCancelThread, ))
    checkAndCancelThread.start()

    #Solve transactions PoW
    userPoWTimeBefore = current_milli_time()
    solve_user_pow = rpc.solve_work(userWorkHash, difficulty)
    userTimeElapsed = current_milli_time() - userPoWTimeBefore
    if "error" in solve_user_pow:
        app_log.error ("PoW fail: " + solve_user_pow["error"])
        return responseAPI({"error": "User PoW fail"}, 500)
    user_block.work = solve_user_pow["work"]
    app_log.info ("User block: Work Done in " + str(userTimeElapsed) + " ms!")

    rewardPoWTimeBefore = current_milli_time()
    solve_reward_pow = rpc.solve_work(reward_block.previous, worker["difficulty"])
    workerTimeElapsed = current_milli_time() - rewardPoWTimeBefore
    if "error" in solve_reward_pow:
        app_log.error ("Reward PoW fail: " + solve_reward_pow["error"])
        return responseAPI({"error": "PoW fail"}, 500)
    reward_block.work = solve_reward_pow["work"]
    app_log.info ("Reward block: Work Done in " + str(workerTimeElapsed) + " ms!")

    #stop checkAndCancel loop
    stop_checkAndCancelThread = True
    checkAndCancelThread.join()

    #BROADCAST TRANSACTIONS
    broad_user_block = rpc.broadcast(user_block.json())
    broad_reward_block = rpc.broadcast(reward_block.json())
    if "error" in broad_user_block:
        app_log.error ("Error broadcasting user block: " + str(broad_user_block["error"]))
        return responseAPI({"error": "Error broadcasting user block: " + broad_user_block["error"]}, 500)
    if "error" in broad_reward_block:
        app_log.error ("Error broadcasting reward block: " + str(broad_reward_block["error"]))
    totalTimeElapsed = current_milli_time() - timeBefore
    app_log.info ("Real time: " + str(totalTimeElapsed) + "ms")

    #RESPONSE
    if 'hash' in broad_user_block:
        app_log.info ("User transaction successful! Block: " + broad_user_block["hash"])
        response = {
            "successful": {
                "user_block": {
                    "hash": broad_user_block["hash"],
                    "work": user_block.work
                }
            }
        }

        if 'hash' in broad_reward_block:
            app_log.info ("Reward transaction successful! Block: " + broad_reward_block["hash"])
            app_log.info ("Time total elapsed: " + str(totalTimeElapsed) + " ms!")
            app_log.info ("Your reward: " + to_mega_nano(user_fee) + " Nano!!!")
            response["successful"]["reward_block"] = {
                "hash": broad_reward_block["hash"],
                "work": reward_block.work
            }
        else:
            app_log.warning ("Reward transaction fail. Details: " + json.dumps(broad_reward_block))
            response["successful"]["reward_block"] = "fail"
    else:
        app_log.warning ("User transaction fail. Details: " + json.dumps(broad_user_block) + "\n")
        response = {"error": "User transaction fail. Details: " + json.dumps(broad_user_block)}

    return responseAPI(response, 201)

#serve P2PoW API with waitress
def startAPI ():
    try:
        waitress.serve(app, host=worker["service_listen"], port=worker["service_port"], _quiet=True)
    except Exception as err:
        app_log.error ("Error: unable to start API. Reason: " + str(err))

if __name__ == '__main__':
    try:
        #Init
        init.pass_args()
        init.check_node()
        init.check_worker()
        init.get_active_difficulty()
        init.check_register()
        Thread(target=startAPI).start()
    except Exception as err:
        app_log.error ("Error: unable to start API. Reason: " + str(err))
        quit()
    else:
        app_log.info("Serving on http://" + str(worker["service_listen"]) + ":" + str(worker["service_port"]))
        init.dont_die()