const fs = require('fs');
const path = require('path');

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

let apCounter = 100;
const files = readDir('src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    content = content.replace(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g, (apMatch, block) => {
        apCounter++;
        let elCounter = 0;
        const newBlock = block.replace(/(&&\s*\(\s*)<([a-zA-Z0-9_\.]+)([^>]*)/g, (match, prefix, tag, props) => {
            if (!props.includes('key=')) {
                elCounter++;
                changed = true;
                return `${prefix}<${tag} key="ap-auto-${apCounter}-${elCounter}"${props}`;
            }
            return match;
        });
        return apMatch.replace(block, newBlock);
    });
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Fixed AP keys in ${file}`);
    }
});
