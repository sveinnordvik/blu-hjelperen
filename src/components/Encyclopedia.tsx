import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';
import { generateAcademicResponse } from '../services/geminiService';

interface DictionaryEntry {
  term: string;
  desc: string;
  category?: string;
  example?: string;
}

export function Encyclopedia({
  onBackToTools
}: {
  onBackToTools?: () => void;
} = {}) {
  const [activeMenuId, setActiveMenuId] = useState('litteratur');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  
  // KI-oppslag for begreper som ikke finnes i listen
  const [isAiDefining, setIsAiDefining] = useState(false);
  const [aiCustomDefinition, setAiCustomDefinition] = useState<DictionaryEntry | null>(null);

  // Mobil-spesifikk trekkspill-state (kollapsbare begreper)
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const toggleTerm = (term: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  };

  const expandAll = (terms: string[]) => {
    setExpandedTerms(new Set(terms));
  };

  const collapseAll = () => {
    setExpandedTerms(new Set());
  };

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
    <>
      {/* DESKTOP VISNING (Uendret og bevart for md: og oppover) */}
      <div className="hidden md:block w-full h-full">
        <WorkspaceLayout
      title="Oppslagsverk"
      subtitle="Fagbegreper og guider"
      icon={<Library className="w-6 h-6" />}
      actionButtonLabel="Søk i pensum"
      onActionClick={() => setActiveMenuId('litteratur')}
      onBackToTools={onBackToTools}
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

              {/* Kontroller for å utvide/kollapse alle */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Viser {filteredDictionary.length} {filteredDictionary.length === 1 ? 'begrep' : 'begreper'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => expandAll(filteredDictionary.map(item => item.term))}
                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Utvid alle
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Kollaps alle
                  </button>
                </div>
              </div>

              {/* Grid over begreper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDictionary.map((item, idx) => {
                  const isExpanded = expandedTerms.has(item.term);
                  return (
                    <div 
                      key={`${item.term}-${idx}`} 
                      onClick={() => toggleTerm(item.term)}
                      className={`bg-white p-5 rounded-2xl shadow-sm border transition-all flex flex-col justify-between group relative cursor-pointer select-none ${
                        isExpanded ? 'border-primary/40 ring-1 ring-primary/10 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-primary shrink-0 transition-transform" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0 transition-transform" />
                            )}
                            <h3 className="font-bold text-base text-slate-800 group-hover:text-primary transition-colors truncate">
                              {item.term}
                            </h3>
                          </div>
                          {item.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                              {item.category}
                            </span>
                          )}
                        </div>

                        {/* Ekspanderbart innhold */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-3"
                              onClick={(e) => e.stopPropagation()} // Hindre lukking ved klikk på teksten
                            >
                              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                {item.desc}
                              </p>
                              {item.example && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 italic">
                                  <span className="font-semibold text-slate-600 not-italic">Eksempel: </span>
                                  {item.example}
                                </div>
                              )}

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(item.term, item.desc);
                                  }}
                                  className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
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
      </div>

      {/* MOBIL VISNING (Fjernet sidebar, 2-linjers forminskede piller, kollapsbare begreper) */}
      <div className="md:hidden w-full max-w-xl mx-auto pb-24 px-3 sm:px-4 space-y-4">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 p-5 rounded-3xl text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            {onBackToTools && (
              <button
                type="button"
                onClick={onBackToTools}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 py-1 px-2.5 rounded-lg mb-3 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Tilbake til verktøy
              </button>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-xs">
                <Library className="w-4 h-4 text-white" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                Faglig støtte & oppslag
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Pedagogisk oppslagsverk
            </h1>
            <p className="text-xs text-indigo-100/90 mt-1 max-w-sm">
              Fagbegreper, litteraturforslag og guider for Zotero og EndNote.
            </p>
          </div>
        </div>

        {/* 2-linjers forminskede piller (4 valg fordelt 2x2 for umiddelbar tilgang uten horisontal scroll) */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'begreper', label: '📖 Begrepsbase' },
            { id: 'litteratur', label: '🔍 Pensumsøk' },
            { id: 'zotero', label: '🔖 Zotero-guide' },
            { id: 'endnote', label: '🔖 EndNote-guide' }
          ].map((item) => (
            <button
              key={`mobile-tab-${item.id}`}
              type="button"
              onClick={() => setActiveMenuId(item.id)}
              className={`text-xs py-2 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMenuId === item.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* INNHOLD BASERT PÅ AKTIVT MENYVALG */}

        {/* 1. BEGREPER (Kollapsbare trekkspill-kort) */}
        {activeMenuId === 'begreper' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Søkefelt */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk begrep (f.eks. Resiliens, Ontologi...)"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium"
              />
            </div>

            {/* Kontroll-linje: Antall & Åpne/Lukk alle */}
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
              <span>{filteredDictionary.length} pedagogiske begreper</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => expandAll(filteredDictionary.map(d => d.term))}
                  className="font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  Åpne alle
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Lukk alle
                </button>
              </div>
            </div>

            {/* Begrepsliste - Trekkspill / Accordion */}
            <div className="space-y-2.5">
              {filteredDictionary.map((item, idx) => {
                const isExpanded = expandedTerms.has(item.term);
                return (
                  <div
                    key={`term-${item.term}-${idx}`}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTerm(item.term)}
                      className="w-full p-3.5 flex items-center justify-between text-left gap-2 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {item.term}
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isExpanded ? 'rotate-180 text-indigo-600' : ''
                        }`} 
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 text-xs text-slate-700 space-y-2.5 bg-slate-50/40 animate-in fade-in duration-150">
                        <p className="leading-relaxed">
                          {item.desc}
                        </p>
                        {item.example && (
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-600 italic">
                            <span className="font-semibold text-slate-800 not-italic">Eksempel: </span>
                            {item.example}
                          </div>
                        )}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.term, item.desc);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            {copiedTerm === item.term ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Kopiert!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Kopier definisjon</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* KI-definisjon dersom ingen treff */}
            {filteredDictionary.length === 0 && (
              <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Fant ingen definisjon for «{searchTerm}»
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Vil du at Superveilederen skal slå opp begrepet tilpasset barnehagelærerutdanningen?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchAiDefinition}
                  disabled={isAiDefining}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 mx-auto shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAiDefining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Henter definisjon...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hent forklaring med KI</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. PENSUM & LITTERATURFORSLAG */}
        {activeMenuId === 'litteratur' && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Pensum & litteratursøk</h3>
                <p className="text-slate-500 text-xs">Få konkrete bok-, artikkel- og Rammeplantips.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Hva handler oppgaven eller praksisen din om?
                </label>
                <textarea 
                  rows={4}
                  value={literatureTopic}
                  onChange={(e) => setLiteratureTopic(e.target.value)}
                  placeholder="F.eks. Lekens betydning for språkutvikling hos flerspråklige barn, eller overganger fra småbarnsavdeling..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {literatureError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{literatureError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleFetchLiterature}
                disabled={isFetchingLiterature || !literatureTopic.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isFetchingLiterature ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Leter frem relevant litteratur...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Søk i faglitteratur</span>
                  </>
                )}
              </button>

              {literatureResults && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-xs font-black text-slate-800">Anbefalt litteratur</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(literatureResults);
                        setCopiedTerm('literature');
                        setTimeout(() => setCopiedTerm(null), 2000);
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTerm === 'literature' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Kopiert</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopier</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {literatureResults}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ZOTERO GUIDE */}
        {activeMenuId === 'zotero' && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Zotero-guide</h3>
                <p className="text-slate-500 text-xs">Gratis referanseverktøy for Word & Google Docs.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>
                <strong>Hvorfor Zotero?</strong> Zotero samler, lagrer og siterer automatisk i henhold til APA 7 direkte i Word eller Google Docs.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">Slik kommer du i gang:</h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                  <li>Last ned fra <a href="https://www.zotero.org/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Zotero.org</a>.</li>
                  <li>Installer <strong>"Zotero Connector"</strong> i nettleseren din.</li>
                  <li>Bruk Zotero-tillegget i Word for ett-klikks referanser.</li>
                  <li>Velg <strong>"Norsk APA 7th"</strong> i Word-innstillingene.</li>
                </ol>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 text-[11px]">
                <strong className="block mb-0.5">Tips for barnehagelærerstudenter:</strong>
                Rammeplanen for barnehagen kan legges inn som rapport/offentlig dokument med <em>Kunnskapsdepartementet</em> som forfatter.
              </div>

              <a 
                href="https://www.zotero.org/" 
                target="_blank" 
                rel="noreferrer" 
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <span>Åpne Zotero.org</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* 4. ENDNOTE GUIDE */}
        {activeMenuId === 'endnote' && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">EndNote-guide</h3>
                <p className="text-slate-500 text-xs">For studenter med høgskole- eller universitetslisens.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>
                Sjekk med institusjonen din (f.eks. HVL, OsloMet, USN, UiS, DMMH) om du har fri tilgang via Feide og programmvareportalen.
              </p>

              <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl text-blue-900 space-y-1.5">
                <h5 className="font-bold">Tre huskeregler for EndNote:</h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Bruk alltid funksjonen <strong>"Cite While You Write" (CWYW)</strong> i Microsoft Word.</li>
                  <li>Eksporter referanser direkte fra Oria med RIS-format.</li>
                  <li>Lagre EndNote-biblioteket på lokal disk (ikke skylagring som Dropbox/OneDrive, da det kan skade filene).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
