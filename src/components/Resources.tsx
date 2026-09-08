import React, { useState, useRef } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { 
  Library, 
  Folder, 
  UploadCloud, 
  ExternalLink, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Search, 
  BookOpen, 
  Lock, 
  Trash2 
} from 'lucide-react';

export interface ResourcesProps {
  collegeName?: string;
  initialMenu?: 'library' | 'files';
}

const RESOURCE_LINKS: Record<string, string> = {
  'Canvas (Læringsplattform)': 'https://www.instructure.com/canvas/login',
  'Wiseflow (Eksamen)': 'https://europe.wiseflow.net/login/search',
  'Studentweb': 'https://fsweb.no/studentweb/index.jsf',
  'Pensumoversikt': 'https://oria.no',
  'Rammeplan for barnehagen': 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/',
  'Barnehageloven': 'https://lovdata.no/dokument/NL/lov/2005-06-17-64',
  'SIKT (Personvern)': 'https://sikt.no/logg-inn',
  'NESH-Retningslinjer': 'https://www.forskningsetikk.no/retningslinjer/hum-sam/forskningsetiske-retningslinjer-for-samfunnsvitenskap-humaniora-juss-og-teologi/'
};

export function Resources({ collegeName = 'DMMH', initialMenu = 'library' }: ResourcesProps) {
  const [activeMenu, setActiveMenu] = useState<'library' | 'files' | string>(initialMenu);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState([
    { id: '1', name: 'Didaktiske planer', type: 'Mappe', date: '4 timer siden' },
    { id: '2', name: 'Læring gjennom mestring - skoggruppemetoden.pdf', type: 'PDF', date: 'I går' },
    { id: '3', name: 'Generelle prinsipper for alle sesongplaner.docx', type: 'Word', date: '2. sept 2026' }
  ]);

  const menuItems = [
    { id: 'library', title: 'Ressursbibliotek', subtitle: 'Lenker og retningslinjer', icon: <Library className="w-4 h-4" /> },
    { id: 'files', title: 'Mitt Filarkiv', subtitle: 'Organiser dokumenter', icon: <Folder className="w-4 h-4" /> }
  ];

  const handleOpenLink = (linkName: string) => {
    const url = RESOURCE_LINKS[linkName];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTriggerUpload = () => {
    setActiveMenu('files');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploaded = Array.from(e.target.files).map((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let typeName = 'Fil';
      if (ext === 'pdf') typeName = 'PDF';
      else if (ext === 'docx' || ext === 'doc') typeName = 'Word';
      else if (ext === 'xlsx' || ext === 'xls') typeName = 'Excel';

      return {
        id: `${Date.now()}-${idx}`,
        name: file.name,
        type: typeName,
        date: 'Akkurat nå'
      };
    });

    setFiles(prev => [...uploaded, ...prev]);
    e.target.value = '';
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <WorkspaceLayout
      title="Ressurser"
      subtitle="Ditt faglige bibliotek"
      icon={<Library className="w-6 h-6" />}
      actionButtonLabel="Last opp fil"
      onActionClick={handleTriggerUpload}
      historyItems={menuItems}
      activeItemId={activeMenu}
      onItemClick={setActiveMenu}
      historySectionTitle=""
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        className="hidden" 
        id="resources-file-upload-input"
        aria-label="Last opp fil"
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-5xl w-full">

          {/* VISNING 1: RESSURSBIBLIOTEK */}
          {activeMenu === 'library' && (
            <div className="space-y-8 pb-12">
              
              {/* Topptekst */}
              <div>
                <h2 className="text-2xl font-black text-slate-800">Ressursbibliotek</h2>
                <p className="text-slate-500 mt-1">Hurtiglenker til viktige verktøy, lovverk og institusjonens sider.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Din Høgskole */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Din Høgskole ({collegeName})
                  </h3>
                  <div className="space-y-2">
                    {['Canvas (Læringsplattform)', 'Wiseflow (Eksamen)', 'Studentweb', 'Pensumoversikt'].map(link => (
                      <button 
                        key={link} 
                        onClick={() => handleOpenLink(link)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{link}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styring & Etikk */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" /> Styring & Etikk
                  </h3>
                  <div className="space-y-2">
                    {['Rammeplan for barnehagen', 'Barnehageloven', 'SIKT (Personvern)', 'NESH-Retningslinjer'].map(link => (
                      <button 
                        key={link} 
                        onClick={() => handleOpenLink(link)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">{link}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Informasjonsbokser */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-600" /> Personvern & Sikkerhet
                  </h3>
                  <p className="text-sm text-emerald-800 leading-relaxed mb-4">
                    Tjenesten lagrer og behandler teksten din trygt. Data slettes når du lukker økten, og brukes ikke til å trene andres modeller.
                  </p>
                  <ul className="text-xs text-emerald-700 space-y-2">
                    <li>• <strong>Sikker skylagring:</strong> Kryptert i AWS.</li>
                    <li>• <strong>Ingen KI-trening:</strong> Dine data forblir dine.</li>
                  </ul>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" /> KI-Vettregler
                  </h3>
                  <p className="text-sm text-amber-800 leading-relaxed mb-4">
                    Bruk KI som en sparringspartner, ikke som en fasit. Du er alltid ansvarlig for innholdet du leverer.
                  </p>
                  <ul className="text-xs text-amber-700 space-y-2">
                    <li>• <strong>Vær åpen:</strong> Oppgi alltid at KI er brukt.</li>
                    <li>• <strong>Kritisk blikk:</strong> Sjekk alltid fakta mot troverdige kilder.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* VISNING 2: FILARKIV */}
          {activeMenu === 'files' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Filarkiv</h2>
                  <p className="text-slate-500 mt-1">Organiser din pedagogiske kontekst.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" /> Last opp filer
                </button>
              </div>

              {/* Søk og filter */}
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 mb-6">
                <Search className="w-5 h-5 text-slate-400 ml-3" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk i filarkivet..." 
                  className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Filliste */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredFiles.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 font-medium">
                      {searchQuery ? `Ingen filer funnet for «${searchQuery}»` : 'Ingen filer i arkivet ennå.'}
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                            {file.type === 'Mappe' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 text-sm truncate">{file.name}</p>
                            <p className="text-xs text-slate-400">{file.type} • Sist endret {file.date}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                          title="Slett fil"
                          aria-label="Slett fil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </WorkspaceLayout>
  );
}

export default Resources;
