const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
let duplicates = [];
const stateMatches = [...content.matchAll(/useState.*?\[([\s\S]*?)\]\)?;/g)];
stateMatches.forEach(m => {
    const arrContent = m[1];
    const ids = [...arrContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    const dupes = ids.filter((item, index) => ids.indexOf(item) !== index);
    if (dupes.length > 0) {
        duplicates.push(dupes);
    }
});
console.log(duplicates);
