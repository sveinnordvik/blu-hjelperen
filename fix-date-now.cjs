const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('${Date.now()}')) {
        content = content.replace(/\$\{Date\.now\(\)\}/g, '${Date.now()}-${Math.random().toString(36).substr(2, 9)}');
        fs.writeFileSync(f, content);
        console.log("Updated", f);
    }
});
