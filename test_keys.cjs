const fs = require('fs');

function checkFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    let mapCalls = 0;
    
    // Find all mapping loops, extract their arrays and check if there are duplicate ids or titles used in keys
    // Just finding the `.map` and the corresponding `key=`
}
