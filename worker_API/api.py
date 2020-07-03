import time, json, sys, getopt, requests, waitress
from threading import Thread
from flask_cors import CORS
from flask import Flask, request, jsonify
from nanolib import validate_account_id, validate_private_key, get_account_id
from modules.rpc import balance, pending_filter, frontier, block_create, broadcast, get_difficulty, solve_work, cancel_work, validate_work, node_version
from modules.logger import app_log, logFile
from modules.import_config import worker, register_config
from modules.register_worker import checkWorkerRegister

#Pass arguments
try:
    argv = sys.argv[1:]
    opts, args = getopt.getopt(argv,"ho:",["output="])
except getopt.GetoptError:
    print ('api.py -h, --help \t \t This help text')
    print ('api.py -o, --output <filename> \t Write log to file')
    sys.exit(2)
for opt, arg in opts:
    if opt == '-h':
        app_log.info ('api.py -o <outputfile>')
        sys.exit()
    elif opt in ("-o", "--output"):
        logFile(arg)


app_log.info ("Connecting to node and worker node...")

#check if node is online
check_node = node_version()
if "node_vendor" in check_node:
    app_log.info ("Node" + " (" + check_node["node_vendor"] + ") is online on " + worker["node"])
else:
    app_log.info ("Node " + worker["node"] + " error: " + str(check_node["error"]))
    app_log.info ("Exiting...")
    quit()

#check worker
check_worker = validate_work("718CC2121C3E641059BC1C2CFC45666C99E8AE922F7A807B7D07B62C995D79E2", "2bf29ef00786a6bc")
if "difficulty" in check_worker:
    if check_worker["difficulty"] == "ffffffd21c3933f4":
        app_log.info("Worker is online on " + worker["worker_node"])
    else:
        app_log.error("Worker " + worker["worker_node"] + " error validating! Exiting...")
        quit()
else:
    app_log.info ("Worker " + worker["worker_node"] + " error: " + str(check_worker["error"]))
    app_log.info ("Exiting...")
    quit()

#check worker Register
checkWorkerRegister()

#Setup our API server
app = Flask(__name__)
CORS(app)
timeout = 30

current_milli_time = lambda: int(round(time.time() * 1000))

#Listen /request_info
@app.route('/request_info', methods=['GET', 'POST'])
def request_info():
    app_log.info ("Requested Info")
    header = {"version": "1.0.0", "reward_account": worker["account"], "fee": str(worker["fee"]), "max_multiplier": worker["max_multiplier"]}
    if worker["use_active_difficulty"] == True:
        header["min_multiplier"] = get_difficulty()
    else:
        header["min_multiplier"] = 1.0
    return jsonify(header)

#Listen /request_work
@app.route('/request_work', methods=['GET', 'POST'])
def request_work():

    #start time
    timeBefore = current_milli_time()

    #request transactions
    try:
        data = request.get_json(force=True)
    except:
        app_log.warning ("Invalid request received")
        return {"error": "Invalid JSON"}

    #check if user and worker transaction are present
    if "user_transaction" in data:
        user_transaction = data.get("user_transaction")
    else:
        app_log.warning ("User transaction missing")
        return jsonify({"error": "User transaction missing"})

    if "reward_transaction" in data:
        reward_transaction = data.get("reward_transaction")
    else:
        app_log.warning ("Worker transaction missing")
        return jsonify({"error": "Worker transaction missing"})

    #Read transaction and check if is valid
    if "link" not in user_transaction:
        if "link_as_account" in user_block:
            user_transaction["link"] = user_transaction["link_as_account"]
        else:
            return jsonify({"error": "Invalid user transaction"})
    if "link" not in reward_transaction:
        if "link_as_account" in reward_transaction:
            reward_transaction["link"] = reward_transaction["link_as_account"]
        else:
            app_log.warning ("Invalid user transaction")
            return jsonify({"error": "Invalid worker transaction"})

    user_block = block_create("state", user_transaction.get('account').replace("xrb_", "nano_"), user_transaction.get('representative'), user_transaction.get('previous'), user_transaction.get("link").upper(), user_transaction.get('balance'), user_transaction.get("signature").upper())
    if user_block == "invalid":
        app_log.warning ("Invalid user transaction")
        return jsonify({"error": "Invalid user transaction"})
    reward_block = block_create("state", reward_transaction.get('account').replace("xrb_", "nano_"), reward_transaction.get('representative'), reward_transaction.get('previous'), reward_transaction.get("link").upper(), reward_transaction.get('balance'), reward_transaction.get("signature").upper())
    if reward_block == "invalid":
        app_log.warning ("Invalid worker transaction")
        return jsonify({"error": "Invalid worker transaction"})

    #If account source in both transactions is different
    if user_block.account != reward_block.account :
        app_log.warning ("Different source accounts ")
        return jsonify({"error": "Different Accounts source"})

    #If worker account is wrong
    if reward_block.link != worker["public_key"]:
        app_log.warning ("Worker account is incorrect")
        return jsonify({"error": "Worker account is incorrect"})

    #Check if previous block in worker hash is correct
    if reward_block.previous != user_block.block_hash:
        app_log.warning ("Incorrect previous block in worker block")
        return jsonify({"error": "Incorrect previous block in worker block" })

    #Recalculate the Fee with active_difficulty with 10% tolerance
    if worker["use_active_difficulty"] == True:
        multiplier = get_difficulty()
        if (multiplier > worker["max_multiplier"]):
            return jsonify({"error": "Maximum difficulty exceded"})
        else:
            app_log.info ("Using active difficulty: " + str(multiplier))
        if multiplier * 0.9 > 1.0:
            worker["fee"] *= (multiplier * 0.9) #multiplier fee with tolerance
        else:
            worker["fee"] *= 1.0
    else:
        multiplier = 1.0

    #Check if fee is right
    user_fee = user_block.balance - reward_block.balance
    if user_fee < worker["fee"]:
        app_log.warning ( "Fee " + str(user_fee) + " is less than minimum " + str(worker["fee"]))
        return jsonify({"error": "Fee is less than minimum"})

    #Check previous block
    if frontier(user_block.account) == user_block.previous:
        app_log.info ("Block is valid: " + user_block.block_hash)
    else:
        app_log.warning ("Wrong previous block")
        return jsonify({"error": "Wrong previous block"})


    #If user transaction is RECEIVE type, check if is valid (search in pending transactions)
    user_actualBalance = balance(user_block.account)
    user_receiveAmount = user_block.balance - user_actualBalance
    if  user_actualBalance < int(user_block.balance):
        user_pendings = pending_filter (user_block.account, user_receiveAmount, -1)
        if user_pendings != None and user_block.link in user_pendings and int(user_pendings[user_block.link]) == user_receiveAmount:
            app_log.info ("User receiving " + str(user_receiveAmount) + " raws")
        else:
            app_log.warning ("Invalid receive transaction")
            return jsonify({"error": "Invalid receive transaction"})
    else:
            #If user transaction is SEND type, check if account source has sufficient funds for both transactions
            if balance(user_block.account) < int(reward_block.balance):
                app_log.warning ("Insufficient funds")
                return jsonify({"error": "Insuficient funds"})
            else:
                app_log.info ("User sending: " + str(user_receiveAmount) + " raws")
                app_log.info ("Account has sufficient funds")

    #If all is right, check active_difficulty and PoW both transactions
    if user_block.previous == "0000000000000000000000000000000000000000000000000000000000000000":
        r = requests.post(worker["node"], json={ "action": "account_key", "account" : user_block.account },  timeout=timeout)
        userWorkHash = r.json()["key"]
    else:
        userWorkHash = user_block.previous

    app_log.info ("Solving Works...")

    def checkAndCancel(stop):
        stopCheckAndCancel = False
        while stopCheckAndCancel == False:
            l_frontier = frontier(user_block.account)
            if l_frontier != user_block.previous and l_frontier != reward_block.previous and l_frontier != reward_block.block_hash:
                    app_log.warning ("User transaction found! Someone passed you!")
                    app_log.warning ("Canceling works...")
                    cancelWork = cancel_work(user_block.previous)
                    if "error" in cancelWork:
                        app_log.error("Error canceling user_block work: " + str(cancelWork["error"]))
                    cancelWork = cancel_work(reward_block.previous)
                    if "error" in cancelWork:
                        app_log.error("Error canceling user_block work: " + str(cancelWork["error"]))
                    stopCheckAndCancel = True
            time.sleep(0.2)
            if stop():
                break

    #start check loop
    stop_checkAndCancelThread = False
    checkAndCancelThread = Thread(target=checkAndCancel, args =(lambda : stop_checkAndCancelThread, ))
    checkAndCancelThread.start()

    #Solve transactions PoW
    userTimeBefore = current_milli_time()
    solve_user = solve_work(userWorkHash, multiplier)
    userTimeElapsed = current_milli_time() - userTimeBefore
    if "error" in solve_user:
        app_log.error ("PoW fail: " + solve_user["error"])
        return jsonify({"error": "User PoW fail"})
    else:
        user_block.work = solve_user["work"]
    app_log.info ("User transaction: Work Done in " + str(userTimeElapsed) + " ms!")

    workerTimeBefore = current_milli_time()
    solve_reward = solve_work(reward_block.previous, multiplier)
    workerTimeElapsed = current_milli_time() - workerTimeBefore
    if "error" in solve_reward:
        app_log.error ("Reward PoW fail: " + solve_reward["error"])
        return jsonify({"error": "PoW fail"})
    else:
        reward_block.work = solve_reward["work"]
    app_log.info ("Worker transaction: Work Done in " + str(workerTimeElapsed) + " ms!")

    #stop check loop
    stop_checkAndCancelThread = True
    checkAndCancelThread.join()

    #Broadcast
    br_user = broadcast(user_block.json())
    br_reward = broadcast(reward_block.json())
    if "error" in br_user:
        app_log.error ("Error broadcasting: " + str(br_user["error"]))
        return br_user["error"]
    if "error" in br_reward:
        app_log.error ("Error broadcasting: " + str(br_reward["error"]))
        return br_reward["error"]
    totalTimeElapsed = current_milli_time() - timeBefore
    app_log.info ("Real time: " + str(totalTimeElapsed) + "ms")

    #response
    if 'hash' in br_user:
        app_log.info ("User transaction successful! Block: " + br_user["hash"])
        response = {
            "successful": {
                "user_block": {
                    "hash": br_user["hash"],
                    "work": user_block.work
                }
            }
        }

        if 'hash' in br_reward:
            app_log.info ("Worker transaction successful! Block: " + br_reward["hash"])
            app_log.info ("Time total elapsed: " + str(totalTimeElapsed) + " ms!")
            app_log.info ("Your reward has arrived!")
            response["successful"]["reward_block"] = {
                "hash": br_reward["hash"],
                "work": reward_block.work
            }
        else:
            app_log.warning ("Worker transaction fail. Details: " + json.dumps(br_reward))
            response["successful"]["reward_block"] = "fail"
    else:
        app_log.warning ("User transaction fail. Details: " + json.dumps(br_user) + "\n")
        response = {"error": "User transaction fail. Details: " + json.dumps(br_user)}

    return jsonify(response)


waitress.serve(app, host=worker["service_listen"], port=worker["service_port"])
