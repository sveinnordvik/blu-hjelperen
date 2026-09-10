import React, { useState } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  Library, 
  Search, 
  Book, 
  Bookmark, 
  FileText, 
  ExternalLink,
  Sparkles,
  Loader2,
  Copy,
  Check,
  HelpCircle,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { generateAcademicResponse } from '../services/geminiService';

interface DictionaryEntry {
  term: string;
  desc: string;
  category?: string;
  example?: string;
}

export function Encyclopedia() {
  const [activeMenuId, setActiveMenuId] = useState('litteratur');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  
  // KI-oppslag for begreper som ikke finnes i listen
  const [isAiDefining, setIsAiDefining] = useState(false);
  const [aiCustomDefinition, setAiCustomDefinition] = useState<DictionaryEntry | null>(null);

  // Litteraturforslag
  const [literatureTopic, setLiteratureTopic] = useState('');
  const [isFetchingLiterature, setIsFetchingLiterature] = useState(false);
  const [literatureResults, setLiteratureResults] = useState<string | null>(null);
  const [literatureError, setLiteratureError] = useState<string | null>(null);

  // Menyvalg i sidemenyen (tilpasset WorkspaceLayout)
  const menuItems: HistoryItem[] = [
    { id: 'litteratur', title: 'Litteraturforslag', subtitle: 'Finn relevant pensum', icon: <Search className="w-4 h-4" /> },
    { id: 'begreper', title: 'Pedagogisk Begrepsdatabank', subtitle: 'Søk i faguttrykk', icon: <Book className="w-4 h-4" /> },
    { id: 'zotero', title: 'Guide: Zotero', subtitle: 'Referansehåndtering', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'endnote', title: 'Guide: EndNote', subtitle: 'Referansehåndtering', icon: <Bookmark className="w-4 h-4" /> },
  ];

  // Begrepsdatabase for barnehagelærerutdanningen
  const baseDictionary: DictionaryEntry[] = [
    { 
      term: 'Ontologi', 
      desc: 'Læren om hva som finnes, eller om hvordan virkeligheten er beskaffen. I barnehagepedagogikk: Hva er et barn? Hva er lekens egenverdi?',
      category: 'Vitenskapsteori',
      example: 'Når du drøfter barnesyn i bacheloroppgaven, berører du et ontologisk spørsmål.'
    },
    { 
      term: 'Epistemologi', 
      desc: 'Erkjennelsesteori. Læren om hva kunnskap er og hvordan vi får kunnskap om verden, for eksempel gjennom barns lek og medvirkning.',
      category: 'Vitenskapsteori',
      example: 'Får vi best kunnskap om barns trivsel gjennom observasjon eller barnesamtaler?'
    },
    { 
      term: 'Hermeneutikk', 
      desc: 'Tolkningslære. Hvordan vi forstår mening og intensjon ved å se enkelthandlinger i lys av helheten (den hermeneutiske sirkel).',
      category: 'Vitenskapsteori',
      example: 'Tolkning av praksisfortellinger og barns verbale og non-verbale uttrykk.'
    },
    { 
      term: 'Didaktikk', 
      desc: 'Undervisnings- og dannelseslære. Teori om planlegging, gjennomføring, begrunnelse og vurdering av pedagogisk virksomhet.',
      category: 'Pedagogikk',
      example: 'Den didaktiske relasjonsmodellen brukt i samlingsstunder eller prosjektarbeid.'
    },
    { 
      term: 'Empiri', 
      desc: 'Kunnskap innhentet gjennom erfaring, observasjon eller systematiske undersøkelser (f.eks. feltnotater, intervjuer og praksisobservasjoner).',
      category: 'Metode',
      example: 'Dine egne observasjonsnotater fra barnehageavdelingen utgjør oppgavens empiri.'
    },
    { 
      term: 'Reliabilitet', 
      desc: 'Pålitelighet og nøyaktighet i datainnsamlingen. Ville en annen forsker eller student kommet frem til tilsvarende funn med samme fremgangsmåte?',
      category: 'Metode',
      example: 'Transkribering av intervjuer og detaljerte feltnotater styrker oppgavens reliabilitet.'
    },
    { 
      term: 'Validitet', 
      desc: 'Gyldighet og relevans. Undersøker du faktisk det problemstillingen din spør etter, og er konklusjonene dine godt faglig underbygget?',
      category: 'Metode',
      example: 'Sikre at intervjuguide og observasjonsfokus treffer problemstillingens kjerne.'
    },
    { 
      term: 'Abduksjon', 
      desc: 'En veksling mellom teori og empiri i analyseprosessen, der forskeren kontinuerlig lar observasjoner og teorier berike og utfordre hverandre.',
      category: 'Vitenskapsteori',
      example: 'Du observerer noe uventet i sandkassen, leter opp ny leketeori, og ser observasjonen med nye øyne.'
    },
    { 
      term: 'Fenomenologi', 
      desc: 'Studiet av fenomener slik de oppleves og erfares av mennesket (livsverden). Opptatt av barns førstepersonsperspektiv.',
      category: 'Vitenskapsteori',
      example: 'Hvordan opplever ettåringen overgangen fra hjem til barnehage?'
    },
    { 
      term: 'Diskurs', 
      desc: 'En bestemt måte å snakke om, forstå og praktisere et fenomen på i en gitt historisk og kulturell kontekst.',
      category: 'Samfunn & Teori',
      example: 'Diskurser om «skoleforberedende aktiviteter» kontra «lekens frie egenverdi» i barnehagen.'
    },
    { 
      term: 'Resiliens', 
      desc: 'Motstandskraft og psykologisk elastisitet; evnen til å mestre motgang, stress eller vanskelige livsbelastninger over tid.',
      category: 'Utviklingspsykologi',
      example: 'Hvordan trygge relasjoner til barnehagelærere bygger resiliens hos sårbare barn.'
    },
    { 
      term: 'Stillaser (Scaffolding)', 
      desc: 'Bruners begrep (bygget på Vygotskij) om den midlertidige støtten en voksen gir for å hjelpe barnet til å mestre noe det ikke klarer alene.',
      category: 'Pedagogikk',
      example: 'Pedagogen støtter og veileder barnet med ord og handling under puslespill eller treklatring.'
    }
  ];

  const allDictionary = aiCustomDefinition 
    ? [aiCustomDefinition, ...baseDictionary]
    : baseDictionary;

  const filteredDictionary = allDictionary.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (term: string, text: string) => {
    navigator.clipboard.writeText(`${term}: ${text}`);
    setCopiedTerm(term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const handleFetchAiDefinition = async () => {
    if (!searchTerm.trim()) return;
    setIsAiDefining(true);
    try {
      const response = await generateAcademicResponse(
        `Definer begrepet "${searchTerm}" for en barnehagelærerstudent. 
Skriv en konsis definisjon (2-3 setninger) rettet mot barnehagepedagogikk, vitenskapsteori eller metode, og gi et kort praktisk eksempel fra barnehagen.`,
        [],
        'balanced',
        { frameworkFocus: 'Format: Akademisk ordbok for barnehagelærerutdanningen' }
      );

      setAiCustomDefinition({
        term: searchTerm.trim(),
        desc: response,
        category: 'KI-definisjon'
      });
    } catch (err) {
      console.error('Failed to fetch AI definition', err);
    } finally {
      setIsAiDefining(false);
    }
  };

  const handleFetchLiterature = async () => {
    if (!literatureTopic.trim()) return;
    setIsFetchingLiterature(true);
    setLiteratureError(null);
    try {
      const response = await generateAcademicResponse(
        `Foreslå relevant pensum, faglitteratur, forskningsartikler og teoretikere for en barnehagelærerstudent som skriver om følgende tema:
"${literatureTopic}"

Strukturer svaret ryddig og akademisk:
1. Sentrale teoretikere og fagbøker (forfatter, tittel og relevans)
2. Relevante kapitler i Rammeplanen for barnehagen
3. Nøkkelartikler eller forskningsfelt i barnehagepedagogikk
4. Tips til søkeord i Oria/Google Scholar/Idunn`,
        [],
        'balanced',
        { frameworkFocus: 'Pensumanbefalinger og litteraturforslag for barnehagelærerutdanningen' }
      );
      setLiteratureResults(response);
    } catch (err: any) {
      console.error('Failed to fetch literature suggestions', err);
      setLiteratureError(err?.message || 'Kunne ikke hente litteraturforslag. Vennligst prøv igjen.');
    } finally {
      setIsFetchingLiterature(false);
    }
  };

  return (
    <WorkspaceLayout
      title="Oppslagsverk"
      subtitle="Fagbegreper og guider"
      icon={<Library className="w-6 h-6" />}
      actionButtonLabel="Søk i pensum"
      onActionClick={() => setActiveMenuId('litteratur')}
      historyItems={menuItems}
      activeItemId={activeMenuId}
      onItemClick={setActiveMenuId}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-4xl w-full">

          {/* VISNING 1: BEGREPSDATABANK */}
          {activeMenuId === 'begreper' && (
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Book className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Pedagogisk Begrepsdatabank</h2>
                    <p className="text-slate-500 text-sm">Søk etter pedagogiske, didaktiske og vitenskapsteoretiske begreper.</p>
                  </div>
                </div>
                
                <div className="relative mt-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Søk i begreper (f.eks. Resiliens, Ontologi, Didaktikk...)"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-all"
                  />
                </div>
              </div>

              {/* Grid over begreper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDictionary.map((item, idx) => (
                  <div 
                    key={`${item.term}-${idx}`} 
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors">
                          {item.term}
                        </h3>
                        {item.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.desc}
                      </p>
                      {item.example && (
                        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 italic">
                          <span className="font-semibold text-slate-600 not-italic">Eksempel: </span>
                          {item.example}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(item.term, item.desc)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                        title="Kopier definisjon"
                      >
                        {copiedTerm === item.term ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ingen treff -> Hent med AI */}
              {filteredDictionary.length === 0 && (
                <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-300 text-center space-y-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">
                      Fant ingen definisjon for «{searchTerm}» i basislisten
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Vil du at Superveilederen skal slå opp og forklare dette begrepet med utgangspunkt i barnehagelærerutdanningen?
                    </p>
                  </div>
                  <button
                    onClick={handleFetchAiDefinition}
                    disabled={isAiDefining}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center gap-2 mx-auto shadow-md disabled:opacity-50"
                  >
                    {isAiDefining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Henter pedagogisk definisjon...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Hent forklaring med KI</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VISNING 2: ZOTERO GUIDE */}
          {activeMenuId === 'zotero' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="bg-red-50 p-4 rounded-2xl shrink-0">
                  <Bookmark className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Kom i gang med Zotero</h2>
                  <p className="text-slate-500 mt-1 text-sm">Gratis referansehåndtering anbefalt av de fleste høgskoler og universiteter.</p>
                </div>
              </div>
              
              <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                <p>
                  <strong>Hvorfor Zotero?</strong> Zotero samler inn, håndterer og lagrer referansene dine. Det genererer automatisk riktig APA 7-litteraturliste og henvisninger direkte i Microsoft Word eller Google Docs.
                </p>
                
                <h4 className="font-bold text-slate-800 mt-6 mb-2 text-base">Slik gjør du det:</h4>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Last ned Zotero-programmet til PC/Mac fra <a href="https://www.zotero.org/" target="_blank" rel="noreferrer" className="text-primary font-bold underline">Zotero.org</a>.</li>
                  <li>Installer <strong>"Zotero Connector"</strong> i nettleseren din (Chrome, Edge eller Safari) for å lagre artikler og bøker fra Oria, Idunn eller Google Scholar med ett klikk.</li>
                  <li>Installer Zotero-tillegget for Microsoft Word (ofte skjer dette automatisk ved installasjon).</li>
                  <li>Sørg for å velge <strong>"Norsk APA 7th"</strong> (Kildekompasset/Sikt) i dokumentinnstillingene i Word for at referansene skal bli formelt korrekte.</li>
                </ol>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-6 flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 space-y-1">
                    <strong className="text-slate-800">Pro-tips for barnehagelærerstudenter:</strong>
                    <p>Du kan legge inn Rammeplanen for barnehagen direkte i Zotero som rapport/offentlig dokument med Kunnskapsdepartementet som forfatter.</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <a 
                    href="https://www.zotero.org/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-sm"
                  >
                    <span>Gå til Zotero.org</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VISNING 3: ENDNOTE GUIDE */}
          {activeMenuId === 'endnote' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="bg-blue-50 p-4 rounded-2xl shrink-0">
                  <Bookmark className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Kom i gang med EndNote</h2>
                  <p className="text-slate-500 mt-1 text-sm">Avansert verktøy ofte tilbudt via institusjonens programvaresenter.</p>
                </div>
              </div>
              
              <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                <p>
                  EndNote er et kraftig, tradisjonelt referanseverktøy. For bacheloroppgaver og større skrivearbeid er dette gull verdt, men det har en litt brattere læringskurve enn Zotero.
                </p>
                <p>
                  Sjekk med din høgskole eller ditt universitet (f.eks. HVL, OsloMet, USN, UiS, DMMH) om du har gratis studentlisens via Feide og institusjonens programvaresenter (Software Center / Company Portal).
                </p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    <p>
                      <strong>Husk:</strong> Du må bruke funksjonen <strong>"Cite While You Write" (CWYW)</strong> i Microsoft Word. Velg stilen <em>APA 7th</em> (eventuelt institusjonens egne tilpassede stilfil) for å oppfylle kravene til referanseføring.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl text-xs text-blue-900 space-y-2">
                  <h5 className="font-bold">Tre trinn for en problemfri EndNote-opplevelse:</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Eksporter referanser direkte fra Oria med filformatet RIS.</li>
                    <li>Lagre alltid EndNote-biblioteket på lokal disk (ikke i Dropbox eller OneDrive, da det kan skade biblioteket).</li>
                    <li>Av-formater aldri referansene før du eventuelt skal levere en ren tekstfil.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* VISNING 4: LITTERATURFORSLAG */}
          {activeMenuId === 'litteratur' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <Search className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Litteraturforslag</h2>
                  <p className="text-slate-500 mt-1">Få forslag til relevant pensum og faglitteratur for din oppgave.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <Book className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Søk basert på din profil:</strong> Assistenten vet at du er barnehagelærerstudent. Beskriv hva du skriver om, så leter KI-en opp de mest relevante teoretikerne og bøkene for deg.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Hva handler oppgaven din om?</label>
                  <textarea 
                    value={literatureTopic}
                    onChange={(e) => setLiteratureTopic(e.target.value)}
                    className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-primary outline-none resize-none leading-relaxed font-medium text-slate-800"
                    placeholder="Beskriv temaet, problemstillingen eller casen din her (f.eks. 'Jeg skriver om barns medvirkning i utetiden')..."
                  />
                </div>
                <button 
                  onClick={handleFetchLiterature}
                  disabled={isFetchingLiterature || !literatureTopic.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                  {isFetchingLiterature ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Leter opp relevant pensum...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" /> Hent litteraturforslag
                    </>
                  )}
                </button>
              </div>

              {literatureError && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block mb-1">Kunne ikke hente forslag akkurat nå</strong>
                    <span>{literatureError}</span>
                  </div>
                </div>
              )}

              {literatureResults && (
                <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      Anbefalt pensum og litteratur
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(literatureResults);
                        setCopiedTerm('literature');
                        setTimeout(() => setCopiedTerm(null), 2000);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedTerm === 'literature' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopier forslag</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {literatureResults}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </WorkspaceLayout>
  );
}
