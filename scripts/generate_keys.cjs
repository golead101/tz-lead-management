const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log("Generating RSA-2048 keypair...");

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

const scriptsDir = __dirname;
fs.writeFileSync(path.join(scriptsDir, 'private_key.pem'), privateKey);
fs.writeFileSync(path.join(scriptsDir, 'public_key.pem'), publicKey);

console.log("✔ Keys generated successfully.");
console.log("-----------------------------------------");
console.log("Private Key saved to: scripts/private_key.pem");
console.log("Public Key saved to: scripts/public_key.pem");
console.log("-----------------------------------------");
console.log("Paste the following public key string into src/utils/licenseKeys.js:\n");
console.log(publicKey);
