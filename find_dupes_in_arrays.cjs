const fs = require('fs');

function checkFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    
    // Find array literals: [ ... ]
    // A simple way is to find all `{ id: 'something' ... }` and see if they are in the same array.
    // Or just manually inspect the `mainNav` array.
}
