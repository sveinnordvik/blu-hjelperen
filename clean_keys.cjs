const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<SuperChat key="super-chat"/g, '<SuperChat');
content = content.replace(/<DesktopDashboardPage key="desktop-dashboard"/g, '<DesktopDashboardPage');
content = content.replace(/<PromptLibrary key="prompt-library"/g, '<PromptLibrary');
content = content.replace(/<LanguageBot key="language-bot"/g, '<LanguageBot');

fs.writeFileSync('src/App.tsx', content);
