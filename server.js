const https = require('https');
const fs = require('fs');
const path = require('path');

// Create self-signed certificate for HTTPS
const privateKey = fs.readFileSync(path.join(__dirname, 'server.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'server.cert'), 'utf8');

const credentials = { key: privateKey, cert: certificate };

const app = https.createServer(credentials, (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Get the file path
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './docs/index.html';
  } else if (!filePath.startsWith('./docs/')) {
    // If it's not already pointing to docs directory, redirect it there
    filePath = './docs' + filePath.substring(1); // Remove the leading dot
  }

  // Get the file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Read the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 8443;
app.listen(PORT, () => {
  console.log(`\n🔒 QRScan-Combined HTTPS Server running at:`);
  console.log(`\n   https://localhost:${PORT}/`);
  console.log(`\n📱 Open this URL in your browser to access the QR Scanner`);
  console.log(`\n⚠️  Note: You'll see a security warning about the self-signed certificate.`);
  console.log(`   Click "Advanced" -> "Proceed to localhost (unsafe)" to continue.`);
  console.log(`\n🎯 The app supports 3 libraries:`);
  console.log(`   • HTML5-QRCode (feature-rich)`);
  console.log(`   • jsQR (lightweight)`);
  console.log(`   • ZXing (multi-format)`);
  console.log(`\n📸 Allow camera access when prompted by your browser.`);
  console.log(`\n🛑 Press Ctrl+C to stop the server\n`);
});