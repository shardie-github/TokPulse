
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const stamped = html.replace('<span id="ts"></span>', new Date().toISOString());
fs.writeFileSync(path.join(distDir, 'index.html'), stamped, 'utf8');

// copy main.js
fs.copyFileSync(path.join(srcDir, 'main.js'), path.join(distDir, 'main.js'));
console.log('Build complete:', distDir);
