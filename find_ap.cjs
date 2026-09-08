const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches = [...content.matchAll(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g)];
matches.forEach((match, i) => {
    const block = match[1];
    const elements = [...block.matchAll(/&&\s*\(\s*<([a-zA-Z0-9_\.]+)([^>]*)/g)];
    elements.forEach(el => {
        const fullMatch = el[0];
        const tag = el[1];
        const props = el[2];
        if (!props.includes('key=')) {
            console.log(`Needs key in AnimatePresence ${i}: <${tag}>`);
        }
    });
});
