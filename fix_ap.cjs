const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

let apCounter = 0;
content = content.replace(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g, (apMatch, block) => {
    apCounter++;
    let elCounter = 0;
    // We want to replace `&& (\n  <Tag` with `&& (\n  <Tag key="ap-{apCounter}-{elCounter}"`
    // Wait, the regex `&&\s*\(\s*<([a-zA-Z0-9_\.]+)`
    const newBlock = block.replace(/(&&\s*\(\s*)<([a-zA-Z0-9_\.]+)([^>]*)/g, (match, prefix, tag, props) => {
        if (!props.includes('key=')) {
            elCounter++;
            return `${prefix}<${tag} key="ap-auto-${apCounter}-${elCounter}"${props}`;
        }
        return match;
    });
    return apMatch.replace(block, newBlock);
});

fs.writeFileSync('src/App.tsx', content);
