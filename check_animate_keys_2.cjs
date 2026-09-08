const fs = require('fs');

function checkFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const matches = [...content.matchAll(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g)];
    
    matches.forEach((match, i) => {
        const block = match[1];
        // Look for any component right after && (
        const elements = [...block.matchAll(/&&\s*\(\s*<([a-zA-Z0-9_\.]+)([^>]*)/g)];
        elements.forEach(el => {
            const elName = el[1];
            const elProps = el[2];
            if (!elProps.includes('key=')) {
                console.log(`Missing key in ${filename} for <${elName}> in AnimatePresence`);
            }
        });
    });
}
checkFile('src/App.tsx');
