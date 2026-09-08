const fs = require('fs');

function checkFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const mapRegex = /\.map\s*\(\s*\(([^)]+)\)\s*=>/g;
    let match;
    while ((match = mapRegex.exec(content)) !== null) {
        const start = match.index;
        const end = start + 500;
        const block = content.substring(start, end);
        if (!block.includes('key=')) {
            console.log(`Map without key in ${filename}:`, block.substring(0, 100));
        } else {
            const keyMatch = block.match(/key=({[^}]+}|"[^"]+")/);
            // console.log(`Key found: ${keyMatch ? keyMatch[0] : 'Unknown'}`);
        }
    }
}
checkFile('src/App.tsx');
