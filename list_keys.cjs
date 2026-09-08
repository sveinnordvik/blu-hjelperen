const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const animateMatch = content.match(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/);
if (animateMatch) {
    const keys = [...animateMatch[1].matchAll(/key="([^"]+)"/g)].map(m => m[1]);
    console.log("Keys in AnimatePresence:");
    keys.sort();
    let dupes = keys.filter((item, index) => keys.indexOf(item) !== index);
    console.log("Duplicate keys:", [...new Set(dupes)]);
} else {
    console.log("No AnimatePresence found");
}
