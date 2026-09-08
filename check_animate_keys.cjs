const fs = require('fs');

function checkFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const matches = [...content.matchAll(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g)];
    
    matches.forEach((match, i) => {
        const block = match[1];
        // Look for any motion.div or custom component right after && (
        const elements = [...block.matchAll(/&&\s*\(\s*<([a-zA-Z0-9_\.]+)[^>]*>/g)];
        elements.forEach(el => {
            const elStr = el[0];
            if (!elStr.includes('key=')) {
                console.log(`Found element in AnimatePresence without key in ${filename}:`, elStr);
            }
        });
    });
}

function readDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(readDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const path = require('path');
readDir('src').forEach(checkFile);
console.log("Done");
