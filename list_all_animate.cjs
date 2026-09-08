const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches = [...content.matchAll(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g)];

matches.forEach((match, idx) => {
    // console.log(`AnimatePresence ${idx + 1}:`);
    const childrenBlock = match[1];
    
    // Usually duplicate keys happen in arrays (.map) or when explicitly assigned 
    const mapMatches = childrenBlock.match(/\.map\(/g);
    // console.log(`  Contains .map(): ${!!mapMatches}`);
    
    // Are there any hardcoded keys?
    const keys = [...childrenBlock.matchAll(/key=\{?['"]([^'"\}]+)['"]\}?/g)].map(m => m[1]);
    const dupes = keys.filter((item, index) => keys.indexOf(item) !== index);
    if (dupes.length > 0) {
        console.log(`AnimatePresence ${idx + 1} has hardcoded dupes:`, [...new Set(dupes)]);
    }
});
console.log("Done checking all AnimatePresences");
