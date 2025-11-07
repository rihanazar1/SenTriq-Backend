require('dotenv').config();
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

console.log('Testing ImageKit Configuration...\n');
console.log('Public Key:', process.env.IMAGEKIT_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('Private Key:', process.env.IMAGEKIT_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT || '❌ Missing');

// Test authentication
imagekit.listFiles({
  limit: 1
})
  .then(response => {
    console.log('\n✅ ImageKit connection successful!');
    console.log('Files found:', response.length);
  })
  .catch(error => {
    console.error('\n❌ ImageKit connection failed:');
    console.error(error.message);
  });
