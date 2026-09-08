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
    let content = fs.readFileSync(file, 'utf8');
    // Search for key={something} or key={`something`} or key="something"
    // that might evaluate to duplicate values within the same map.
    // E.g. using index as key where elements might be reordered, 
    // or using a non-unique property as key.
    // Just finding all `key={` and checking what they contain.
    const keys = [...content.matchAll(/key=\{?([^>]+)\}?/g)];
    // Not easy to do statically.
});
