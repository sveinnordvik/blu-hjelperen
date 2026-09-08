const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches = [...content.matchAll(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g)];
console.log(matches[9][1]);
