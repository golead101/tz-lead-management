const start = Date.now();
console.log('Loading index.js...');
try {
  const index = require('./index.js');
  console.log(`Successfully loaded index.js in ${Date.now() - start}ms.`);
  console.log('Exported functions:', Object.keys(index));
} catch (err) {
  console.error('Failed to load index.js:', err);
}
