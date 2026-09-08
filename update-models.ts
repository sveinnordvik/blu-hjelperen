import fs from 'fs';

const filePath = 'src/services/geminiService.ts';
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/gemini-1\.5-flash-latest/g, 'gemini-2.5-flash');
content = content.replace(/gemini-1\.5-flash/g, 'gemini-2.5-flash');
content = content.replace(/gemini-3-flash-preview/g, 'gemini-2.5-flash');
fs.writeFileSync(filePath, content);
console.log('Updated geminiService.ts');
