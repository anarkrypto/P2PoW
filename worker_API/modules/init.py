import time, sys, getopt
from threading import Thread
import modules.rpc as rpc
from modules.utils import to_multiplier, multiply_big_number, current_milli_time
from modules.logger import app_log, logFile
from modules.import_config import worker
from modules.register_worker import check_worker_register

active_difficulty = {}

def pass_args():
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
            print('api.py -o <outputfile>')
            sys.exit()
        elif opt in ("-o", "--output"):
            logFile(arg)

#check if node is online and if the node version satisfies
def check_node():
    app_log.info ("Connecting to node...")
    for i in range(1, 21):
        check_version = rpc.node_version()
        if "node_vendor" in check_version:
            
            try:
                version_str = check_version["node_vendor"]
                version = float(version_str[version_str.index('V')+1:len(version_str)])
            except:
                app_log.error ("Could not detect your nano node version")
                quit()
            else:
                if version < 21.2:
                    app_log.error ("Your Nano node version " + version_str + " is not supported. Upgrade to >= V21.2")
                    quit()
                else:
                    app_log.info ("Node" + " (" + version_str + ") is online on " + worker["node"])
                    return True
        else:
            app_log.info ("Node " + worker["node"] + " error: " + check_version["error"])
            if i <= 20:
                app_log.info ("Retrying again in 15 seconds... " + str(i) + " of 20")
        time.sleep(15)
    app_log.info ("Exiting...")
    quit()

#check if worker is online and working
def check_worker():
    app_log.info ("Connecting to worker node...")
    check_worker = rpc.validate_work("718CC2121C3E641059BC1C2CFC45666C99E8AE922F7A807B7D07B62C995D79E2", "2bf29ef00786a6bc")
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

def check_register():
    check_worker_register()


#get active_difficulty 
def get_active_difficulty():
    global active_difficulty 

    active_difficulty = rpc.get_difficulty()
    active_difficulty["last_update"] = current_milli_time()
    worker["difficulty"] = active_difficulty["network_minimum"]
    worker["difficulty_receive"] = active_difficulty["network_receive_minimum"]
    worker["fee"] = worker["default_fee"]
    worker["fee_receive"] = worker["default_fee"] // 2 + multiply_big_number(worker["default_fee"], to_multiplier(active_difficulty["network_receive_minimum"], active_difficulty["network_minimum"]))
    worker["multiplier"] = 1.0

    #update active_difficulty every 10 seconds
    def loop(stop):
        while True: 
            active_difficulty = rpc.get_difficulty()
            active_difficulty["last_update"] = current_milli_time()
            #if use_dynamic_pow, update fee and multiplier to current difficulty
            if worker["use_dynamic_pow"] == True:
                worker["difficulty"] = active_difficulty["network_current"]
                worker["difficulty_receive"] = active_difficulty["network_receive_current"]
                worker["multiplier"] = active_difficulty["multiplier"]
                if worker["use_dynamic_fee"] == True:
                    worker["fee"] = multiply_big_number(worker["default_fee"], to_multiplier(active_difficulty["network_current"], active_difficulty["network_minimum"]))
                    worker["fee_receive"] = worker["default_fee"] // 2 + multiply_big_number(worker["default_fee"], to_multiplier(active_difficulty["network_receive_current"], active_difficulty["network_minimum"]))
            if stop():
                break
            time.sleep(worker["dynamic_pow_interval"])
    #start update_active_difficulty loop asynchronous
    stop_loop_thread = False
    loop_thread = Thread(target=loop, args =(lambda : stop_loop_thread, ))
    loop_thread.start()

def when_next_active_difficulty():
    next = active_difficulty["last_update"] + 30 - current_milli_time
    if next > 1000:
        return next
    return 1000

def dont_die():
    while True:
        time.sleep(30)