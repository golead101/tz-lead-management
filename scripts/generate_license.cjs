const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Helper to parse .env file without external dependencies
function parseEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const index = line.indexOf('=');
      const key = line.substring(0, index).trim();
      let value = line.substring(index + 1).trim();
      
      // Strip surrounding quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
  }
  return env;
}

function askQuestion(rl, query, defaultVal) {
  return new Promise(resolve => {
    rl.question(`${query} (Default: "${defaultVal}"): `, answer => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function runGenerator() {
  const env = parseEnvFile();
  
  // Create interactive interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n=========================================");
  console.log("   Lead CRM License Generator Wizard     ");
  console.log("=========================================");
  console.log("Press Enter to accept the default values.\n");

  const customerName = await askQuestion(rl, "Customer Name", env.LICENSING_CUSTOMER_NAME || 'Demo Academy');
  const email = await askQuestion(rl, "Customer Email", env.LICENSING_CUSTOMER_EMAIL || 'demo@academy.com');
  const type = await askQuestion(rl, "License Type (trial/lifetime)", env.LICENSING_TYPE || 'trial');
  
  let durationDays = 15;
  if (type === 'trial') {
    const durationInput = await askQuestion(rl, "Trial Duration (Days)", env.LICENSING_TRIAL_DURATION_DAYS || '15');
    durationDays = parseInt(durationInput, 10);
  }

  const machineId = await askQuestion(rl, "Lock to Workstation Machine ID (leave blank to skip hardware lock)", "");
  
  const firebaseProjectId = env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';
  
  rl.close();

  // Calculate trial expiry date from current time
  let expiryDate = '';
  if (type === 'trial') {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + durationDays);
    expiryDate = expDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }

  // 1. Build the license payload
  const licenseData = {
    customer: customerName,
    email: email,
    type: type,
    expires: expiryDate,
    firebaseProjectId: firebaseProjectId
  };

  if (machineId && machineId.trim()) {
    licenseData.machineId = machineId.trim();
  }

  const privateKeyPath = path.join(__dirname, 'private_key.pem');
  if (!fs.existsSync(privateKeyPath)) {
    console.error("Error: private_key.pem not found in scripts/ directory. Please run generate_keys.cjs first.");
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const canonicalString = JSON.stringify(licenseData);

  // 2. Generate SHA-256 signature signed by the private key
  const signer = crypto.createSign('SHA256');
  signer.update(canonicalString);
  const signature = signer.sign(privateKey, 'base64');

  // 3. Compile final signed license file
  const signedLicense = {
    ...licenseData,
    signature: signature
  };

  const licenseContent = JSON.stringify(signedLicense, null, 2);

  // Write Location 1: public/license.dat (for Vite bundling fallback)
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'license.dat'), licenseContent);

  // Write Location 2: src-tauri/target/release/bundle/nsis/license.dat (placed directly next to installer)
  const nsisDir = path.join(process.cwd(), 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  if (!fs.existsSync(nsisDir)) {
    fs.mkdirSync(nsisDir, { recursive: true });
  }
  fs.writeFileSync(path.join(nsisDir, 'license.dat'), licenseContent);

  // Also keep a copy in root folder for general backup
  fs.writeFileSync(path.join(process.cwd(), 'license.dat'), licenseContent);

  console.log("\n✔ License file generated successfully!");
  console.log("-----------------------------------------");
  console.log(`Saved in installer folder: ${path.join(nsisDir, 'license.dat')}`);
  console.log(`Saved in public assets: ${path.join(publicDir, 'license.dat')}`);
  console.log("-----------------------------------------");
}

runGenerator().catch(err => {
  console.error("Generator wizard crashed: ", err);
  process.exit(1);
});
