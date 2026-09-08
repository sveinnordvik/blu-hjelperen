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

const files = readDir('src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('.map') || line.includes('key=')) {
            // we can look at array definitions
        }
    });
    
    // Better: extract all arrays with id inside useState
    const stateMatches = [...content.matchAll(/useState.*?\[([\s\S]*?)\]\)?;/g)];
    stateMatches.forEach(m => {
        const arrContent = m[1];
        const ids = [...arrContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
        const dupes = ids.filter((item, index) => ids.indexOf(item) !== index);
        if (dupes.length > 0) {
            console.log(`Duplicate IDs in state in ${file}:`, [...new Set(dupes)]);
        }
    });
});
console.log("Done checking all files for duplicate IDs in state");
