const fs = require('fs');

function checkKeysInFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find all mapping loops, extract their arrays and check if there are duplicate ids or titles used in keys
    // An easier way is to just grep all arrays with 'id: ' and check for duplicate IDs
    const idMatches = [...content.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
    const dupes = idMatches.filter((item, index) => idMatches.indexOf(item) !== index);
    
    console.log("Duplicate IDs in file:", [...new Set(dupes)]);
}
checkKeysInFile('src/App.tsx');
