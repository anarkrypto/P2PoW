function deriveAddress (publicKey, prefix) {
  if (!checkKey(publicKey)) throw new Error('Public key is not valid')
  if (!prefix) prefix = "nano_"
  const publicKeyBytes = hexToByteArray(publicKey)
  const paddedPublicKeyBytes = hexToByteArray(publicKey)
  const encodedPublicKey = encodeNanoBase32(paddedPublicKeyBytes)
  const checksum = blake2b(publicKeyBytes, null, 5).reverse()
  const encodedChecksum = encodeNanoBase32(checksum)
  return prefix + encodedPublicKey + encodedChecksum
}

function parseNanoAddress(address) {
  const invalid = { valid: false, publicKey: null, publicKeyBytes: null }
  if (!checkString(address) || !/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(address)) {
    return invalid
  }
  let prefixLength = address.indexOf('_') + 1
  const publicKeyBytes = decodeNanoBase32(address.substr(prefixLength, 52))
  const publicKey = byteArrayToHex(publicKeyBytes)
  const checksumBytes = decodeNanoBase32(address.substr(-8))
  const computedChecksumBytes = blake2b(publicKeyBytes, null, 5).reverse()
  const valid = compareArrays(checksumBytes, computedChecksumBytes)
  if (!valid) return invalid
  return {
    publicKeyBytes,
    publicKey,
    valid: true
  }
}

function deriveSecretKey(seed, index) {
  const seedBytes = hexToByteArray(seed)
  const indexBuffer = new ArrayBuffer(4)
  const indexView = new DataView(indexBuffer)
  indexView.setUint32(0, index)
  const indexBytes = new Uint8Array(indexBuffer)
  const context = blake2bInit(32)
  blake2bUpdate(context, seedBytes)
  blake2bUpdate(context, indexBytes)
  const secretKeyBytes = blake2bFinal(context)
  return byteArrayToHex(secretKeyBytes)
}


function derivePublicKey(secret) {
  if (checkKey(secret)) {
    const uint_key_pair = nacl.sign.keyPair.fromSecretKey(hexToByteArray(secret))
    return byteArrayToHex(uint_key_pair.publicKey)
  }
}

function deriveKeyPair (seed, index) {
  if (checkKey(seed) && checkIndex(index) ) {
    const private_key = deriveSecretKey(seed, index)
    const public_key = derivePublicKey (private_key)
    const address = deriveAddress (public_key)
    return {secret: private_key, publicKey: public_key, address: address}
  }
}

function createRandomSeed () {
  const random_seed = window.crypto.getRandomValues(new Uint8Array(32))
  return byteArrayToHex(random_seed)
}

function hexToByteArray(hex) {
  let bytes = []
  for (let c = 0; c < hex.length; c += 2)
  bytes.push(parseInt(hex.substr(c, 2), 16));
  return new Uint8Array(bytes);
}

function byteArrayToHex(bytes) {
  let hex = []
  for (let i = 0; i < bytes.length; i++) {
      let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      hex.push((current >>> 4).toString(16));
      hex.push((current & 0xF).toString(16));
  }
  return hex.join("").toUpperCase();
}

function abbrevNanoAddress (address) {
  abrev = address.substr(0, 18) + '...' + address.substr(-8)
  return abrev
}