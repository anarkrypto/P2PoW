import time, nanolib
from decimal import *

#current time in ms
current_milli_time = lambda: int(round(time.time() * 1000))

#Read and create transaction Block
def block_create(block_type, account, representative, previous, link, balance, signature):
    if "_" in link:
        link = nanolib.get_account_public_key(account_id=link)
    try:
        block = nanolib.Block(
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

#Convert Mega Nano to raws
def to_raws(megaNano):
    getcontext().prec = 39
    r = Decimal('1000000000000000000000000000000') * Decimal(megaNano)
    raws = int(str(r).split('.')[0])
    return raws

def to_mega_nano (raws):
    raws = str(raws)
    if int(raws) == 0:
        return '0'
    if len(str(raws)) - 30 > 0:
        megaNano = raws[0:len(raws)-30] 
        fraction = raws[len(raws) - 30 : len(raws) - (len(raws) - 30)]
        if len(fraction) and int(fraction) != 0:
            megaNano += fraction
    else:
        megaNano = "0." + "0" * (30 - len(raws)) + raws
    while megaNano[len(megaNano) - 1] == '0':
        megaNano = megaNano[0:len(megaNano)-1]
    return megaNano

#Convert IP address to valid url format
def to_url(address):
    if not address.startswith("http"):
        return "http://" + address
    else:
        return address

def ip_version(ip_type):
    if ip_type != "ipv4" and ip_type != "ipv6":
        raise Exception('Invalid IP Type / Version!')
    return ip_type

#get multiplier from difficulty
def to_multiplier(difficulty, base_difficulty) -> float:
  return float((1 << 64) - int(base_difficulty, 16)) / float((1 << 64) - int(difficulty, 16))

#get difficulty from multplier
def from_multiplier(multiplier, base_difficulty) -> int:
  return int((1 << 64) - ((1 << 64) - int(base_difficulty, 16)) / multiplier)

def multiply_big_number(number, multiplier):
    getcontext().prec = 39
    return int(Decimal(str(multiplier)) * number)