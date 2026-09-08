const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldVer = `<p className="text-[10px] text-slate-600 font-medium">Lansering av "Basen" som ny hovedplattform for samarbeid. Helt ny prismodell (Semester-pakka), integrert kalender, felles filarkiv og stor oppgradering av mobilbrukervennligheten.</p>`;
const newVer = `<p className="text-[10px] text-slate-600 font-medium">Major Release: Lansering av Basen, ny Semester-modell, og oppgraderte AI-motorer.</p>`;

code = code.replace(oldVer, newVer);

fs.writeFileSync('src/App.tsx', code);
