const fs = require('fs');

function addLogoDownload() {
  let file = fs.readFileSync('src/components/Admin.tsx', 'utf8');
  
  if (!file.includes("import html2canvas")) {
      const importHtml2Canvas = `import html2canvas from 'html2canvas';\nimport { Download } from 'lucide-react';\n`;
      file = file.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + importHtml2Canvas);
  }

  const downloadLogic = `
  const handleDownloadLogo = async () => {
    const logoEl = document.getElementById('app-main-logo');
    if (!logoEl) {
      setNotification('Kunne ikke finne logo-elementet. Last inn siden på nytt.');
      return;
    }

    try {
      // Lag en canvas av elementet med html2canvas, skaler 4x for høy oppløsning
      const canvas = await html2canvas(logoEl, {
        scale: 4,
        backgroundColor: '#ffffff', // Hvit bakgrunn for JPG
        logging: false,
        useCORS: true
      });

      // Konverter canvas til JPG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);

      // Trigg nedlasting
      const link = document.createElement('a');
      link.download = 'blu-logo-admin.jpg';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotification('Logo lastet ned!');
    } catch(err: any) {
      console.error('Feil ved nedlasting av logo:', err);
      setNotification('Kunne ikke generere bilde.');
    }
  };
  `;

  if (!file.includes('handleDownloadLogo')) {
      file = file.replace(/return \(\s*<motion\.div/, downloadLogic + "  return (\n    <motion.div");
  }

  const uiSection = `
          {/* 7. Ressurser og Profilering Section */}
          <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 mt-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-[10px] md:text-sm font-bold text-slate-900 uppercase tracking-widest">Ressurser og Profilering</h3>
            </div>
            
            <div className="flex flex-col items-start gap-3">
              <button 
                onClick={handleDownloadLogo}
                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Last ned logo (.jpg)
              </button>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Genererer en høyoppløselig JPG-kopi av appens logo med hvit bakgrunn.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};`;

  if (!file.includes('Ressurser og Profilering Section')) {
      file = file.replace(/<\/div>\s*<\/div>\s*<\/motion\.div>\s*\);\s*};\s*$/, uiSection);
  }

  fs.writeFileSync('src/components/Admin.tsx', file);
}

addLogoDownload();
