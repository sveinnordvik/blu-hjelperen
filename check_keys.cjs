const fs = require('fs');

function checkKeysInFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    // regex to find all key="value" or key={`value`} or key={value}
    // we want to find siblings with the same key
    
    // a simpler approach is to find all keys in maps
    // and manually inspect them, or just use regex to extract key values
}
