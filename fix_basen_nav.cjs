const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldBasen = `{ id: 'basen', label: 'Basen', icon: Users, subTabs: [
      { id: 'collaboration', label: 'Basen', icon: Users, requiredTier: 'yearly' }
    ]}`;

const newBasen = `{ id: 'basen', label: 'Basen', icon: Users, subTabs: [
      { id: 'collaboration', label: 'Basen', icon: Users, requiredTier: 'free' }
    ]}`;

code = code.replace(oldBasen, newBasen);

fs.writeFileSync('src/App.tsx', code);
