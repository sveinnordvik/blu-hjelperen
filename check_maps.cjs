const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.map(')) {
        // Look ahead 5 lines for key=
        let keyFound = false;
        let keyText = "";
        for (let j = 0; j < 5; j++) {
            if (lines[i+j] && lines[i+j].includes('key=')) {
                keyFound = true;
                keyText = lines[i+j].trim();
                break;
            }
        }
        if (!keyFound) {
            // console.log(`No key found for map on line ${i+1}`);
        } else {
            // console.log(`Map on line ${i+1} has ${keyText}`);
        }
    }
}
