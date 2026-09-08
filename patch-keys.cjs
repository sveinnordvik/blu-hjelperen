const fs = require('fs');

function patchKeys(file) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace `key={chapter.id}` with `key={\`chapter-\${chapter.id}-\${cIndex}\`}`
    content = content.replace(/key=\{chapter\.id\}/g, 'key={`chapter-${chapter.id}-${cIndex}`}');
    content = content.replace(/key=\{sub\.id\}/g, 'key={`sub-${sub.id}-${sIndex}`}');
    content = content.replace(/key=\{item\.id\}/g, 'key={`item-${item.id}-${index||Math.random()}`}');
    content = content.replace(/key=\{model\.id\}/g, 'key={`model-${model.id}`}');
    
    // Admin.tsx specific
    content = content.replace(/key=\{t\.id\}/g, 'key={`archived-${t.id || idx}-${idx}`}');
    
    // Other files
    content = content.replace(/key=\{plan\.id\}/g, 'key={`plan-${plan.id}-${Math.random()}`}');
    content = content.replace(/key=\{folder\.id\}/g, 'key={`folder-${folder.id || Math.random()}`}');
    content = content.replace(/key=\{file\.id\}/g, 'key={`file-${file.id || Math.random()}`}');
    
    fs.writeFileSync(file, content);
}

patchKeys('src/App.tsx');
patchKeys('src/components/Admin.tsx');
patchKeys('src/components/ContextFilesManager.tsx');
patchKeys('src/components/DocumentManager.tsx');
patchKeys('src/components/DidaktiskPlanlegger.tsx');
patchKeys('src/components/Pricing.tsx');
console.log("Patched keys");
