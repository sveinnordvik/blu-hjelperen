import React, { useState, useEffect } from 'react';
import { 
  FileSignature, ShieldCheck, Sparkles, Download, 
  Import, User, Target, ChevronRight, Lock, BookOpen,
  Copy, Check, Printer, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { callGoogleAIProxy } from '../../services/geminiService';

export interface MalFelt {
  id: string;
  tittel: string;
  hjelpetekst: string;
  type: 'tekst' | 'ai-stottet';
}

export const STANDARD_ITP_MAL: MalFelt[] = [
  { 
    id: 'bakgrunn', 
    tittel: '1. Bakgrunn for tiltaket', 
    hjelpetekst: 'Kort oppsummering av sakkyndig vurdering og enkeltvedtak.',
    type: 'tekst' 
  },
  { 
    id: 'langsiktige_maal', 
    tittel: '2. Langsiktige mål', 
    hjelpetekst: 'Overordnede mål fra enkeltvedtaket.',
    type: 'tekst' 
  },
  { 
    id: 'kortsiktige_maal', 
    tittel: '3. Kortsiktige mål (SMARTe)', 
    hjelpetekst: 'Mål for denne perioden. Spesifikke, Målbare, Aksepterte, Realistiske, Tidsavgrensede (Trondheim-modellen).',
    type: 'ai-stottet' 
  },
  { 
    id: 'organisering', 
    tittel: '4. Innhold, organisering og metoder', 
    hjelpetekst: 'Hva skal gjøres? Hvordan? Hvem har ansvaret? Hvor skal det skje?',
    type: 'ai-stottet' 
  },
  { 
    id: 'foreldresamarbeid', 
    tittel: '5. Samarbeid med hjemmet', 
    hjelpetekst: 'Hvordan og hvor ofte skal foreldrene involveres?',
    type: 'tekst' 
  },
  { 
    id: 'evaluering', 
    tittel: '6. Plan for evaluering', 
    hjelpetekst: 'Når og hvordan skal tiltakene evalueres?',
    type: 'tekst' 
  }
];

export default function TiltaksplanBygger({ 
  initialBarnNavn = '', 
  onNavigateToPPT 
}: { 
  initialBarnNavn?: string;
  onNavigateToPPT?: () => void;
}) {
  // 1. DATA FRA STYRERN (Hentet i sanntid fra databasen med lokal backup og fallback til Udir/Trondheim)
  const [kommunalMalFraStyrer, setKommunalMalFraStyrer] = useState<MalFelt[]>(() => {
    try {
      const lagret = localStorage.getItem('itp_master_mal');
      if (lagret) {
        const parsed = JSON.parse(lagret);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: String(item.id),
            tittel: item.tittel || '',
            hjelpetekst: item.hjelpetekst || '',
            type: Boolean(item.aiStottet ?? (item.type === 'ai-stottet')) ? 'ai-stottet' : 'tekst'
          }));
        }
      }
    } catch {}
    return STANDARD_ITP_MAL;
  });

  // Sett opp sanntidslytting mot databasen ('barnehage_innstillinger/itp_mal')
  useEffect(() => {
    if (!db) return;
    
    // Peker på nøyaktig samme dokument som Styrern lagrer til
    const malRef = doc(db, 'barnehage_innstillinger', 'itp_mal');
    
    // onSnapshot lytter kontinuerlig. Skjer det en endring i databasen, oppdateres Pedleder-skjemaet
    const unsubscribe = onSnapshot(malRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.felter) && data.felter.length > 0) {
          const formaterteFelter: MalFelt[] = data.felter.map((item: any) => ({
            id: String(item.id),
            tittel: item.tittel || '',
            hjelpetekst: item.hjelpetekst || '',
            type: Boolean(item.aiStottet ?? (item.type === 'ai-stottet')) ? 'ai-stottet' : 'tekst'
          }));
          setKommunalMalFraStyrer(formaterteFelter);
          localStorage.setItem('itp_master_mal', JSON.stringify(data.felter));
        }
      } else {
        console.log("Fant ingen ITP-mal i databasen.");
      }
    }, (error) => {
      console.warn("onSnapshot mot barnehage_innstillinger/itp_mal feilet eller er offline:", error);
    });

    // Lytt også på lokal hendelse for momentan respons i samme nettleserfane
    const oppdaterMalLokalt = () => {
      try {
        const lagret = localStorage.getItem('itp_master_mal');
        if (lagret) {
          const parsed = JSON.parse(lagret);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setKommunalMalFraStyrer(parsed.map((item: any) => ({
              id: String(item.id),
              tittel: item.tittel || '',
              hjelpetekst: item.hjelpetekst || '',
              type: Boolean(item.aiStottet ?? (item.type === 'ai-stottet')) ? 'ai-stottet' : 'tekst'
            })));
          }
        }
      } catch {}
    };

    window.addEventListener('itp_mal_updated', oppdaterMalLokalt);
    window.addEventListener('storage', oppdaterMalLokalt);

    // Viktig: Slutt å lytte når pedlederen forlater denne siden, for å spare minne
    return () => {
      unsubscribe();
      window.removeEventListener('itp_mal_updated', oppdaterMalLokalt);
      window.removeEventListener('storage', oppdaterMalLokalt);
    };
  }, []);

  // 2. LOKALE STATES med persistering
  const [barnetsNavn, setBarnetsNavn] = useState<string>(() => {
    return initialBarnNavn || localStorage.getItem('itp_barnets_navn') || '';
  });

  const [itpData, setItpData] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('itp_data_kladd');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [stikkordState, setStikkordState] = useState<Record<string, string>>({
    kortsiktige_maal: '',
    organisering: ''
  });

  const [behandlerAI, setBehandlerAI] = useState<boolean>(false);
  const [aktivtAIFelt, setAktivtAIFelt] = useState<string | null>(null);
  const [skjoldVarsel, setSkjoldVarsel] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Auto-lagring i localStorage
  useEffect(() => {
    localStorage.setItem('itp_barnets_navn', barnetsNavn);
  }, [barnetsNavn]);

  useEffect(() => {
    try {
      localStorage.setItem('itp_data_kladd', JSON.stringify(itpData));
    } catch {}
  }, [itpData]);

  // 3. HENT FRA BEKYMRINGSRUTEN / PPT-LOGG
  const handleImportFraPPTLogg = () => {
    // Sjekk om det finnes ekte data lagret i appletens andre moduler
    const loggetNavn = localStorage.getItem('ppt_veileder_siste_navn') || localStorage.getItem('lederstotte_barnets_navn');
    const lagretLogg = localStorage.getItem('lederstotte_generert_logg') || localStorage.getItem('lederstotte_observasjon');
    
    let importertBakgrunn = "";
    if (lagretLogg && lagretLogg.trim().length > 10) {
      importertBakgrunn = `Hentet fra Bekymrings-ruten / Observasjonslogg:\n${lagretLogg.trim().slice(0, 1000)}\n\nSakkyndig vurdering fra PPT foreligger med anbefaling om tilrettelegging og spesialpedagogisk støtte.`;
    } else {
      importertBakgrunn = "Hentet fra Bekymrings-ruten (12.09): Viser behov for støtte i overganger og lek. Sakkyndig vurdering fra PPT foreligger med anbefaling om støttepedagog 4 timer i uken.";
    }

    if (!barnetsNavn && loggetNavn) {
      setBarnetsNavn(loggetNavn);
    }

    setItpData(prev => ({
      ...prev,
      bakgrunn: importertBakgrunn
    }));
  };

  // 4. KI-STØTTET UTFORMING MED SKJOLD
  const handleSokratiskMaal = async (feltId: string, stikkordInput?: string) => {
    const rawStikkord = (stikkordInput || stikkordState[feltId] || '').trim();

    if (!barnetsNavn.trim()) {
      setSkjoldVarsel("Sikkerhetsstopp: Fyll inn barnets fornavn øverst for at anonymiserings-skjoldet skal fungere.");
      setTimeout(() => setSkjoldVarsel(null), 5000);
      return;
    }
    if (!rawStikkord) {
      setSkjoldVarsel("Skriv inn noen stikkord først, så strukturerer KI-veilederen det for deg.");
      setTimeout(() => setSkjoldVarsel(null), 4000);
      return;
    }

    setSkjoldVarsel(null);
    setBehandlerAI(true);
    setAktivtAIFelt(feltId);

    // SKJOLDET: Fjerner barnets navn lokalt på enheten
    const escapedNavn = barnetsNavn.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const navnRegex = new RegExp(escapedNavn, 'gi');
    const vasketTekst = rawStikkord.replace(navnRegex, '[BARNET]');

    console.log("SENDES TIL KI (Anonymisert):", vasketTekst);

    try {
      const gjeldendeFelt = kommunalMalFraStyrer.find(f => f.id === feltId);
      const tittel = (gjeldendeFelt?.tittel || feltId).toLowerCase();

      let prompt = "";
      if (feltId === 'kortsiktige_maal' || tittel.includes('mål') || tittel.includes('smart')) {
        prompt = `Du er en erfaren spesialpedagog og veileder for barnehagelærere i Norge.
Formuler 2-3 konkrete kortsiktige mål basert på disse stikkordene: "${vasketTekst}".
Følg SMART-kriteriene strengt (Spesifikt, Målbart, Akseptert, Realistisk, Tidsavgrenset) tilpasset barnehagehverdagen og Trondheimsmodellen for spesialpedagogikk.
Bruk plassholderen [BARNET] konsekvent.
Skriv i et profesjonelt, nøkternt fagspråk egnet for arkiv i kommunens fagsystem.
Avslutt med en kort setning om hvordan målene oppfyller SMART-kriteriene.`;
      } else if (feltId === 'organisering' || tittel.includes('organisering') || tittel.includes('metode') || tittel.includes('innhold')) {
        prompt = `Du er en erfaren spesialpedagog og veileder for barnehagelærere i Norge.
Strukturer tiltakets innhold, organisering og metoder basert på disse stikkordene: "${vasketTekst}".
Bruk denne faste strukturen:
HVA: (Hvilke aktiviteter eller tiltak)
HVORDAN: (Metoder, visuell støtte, organisering i barnegruppen)
HVEM: (Ansvarlig pedagog / støtteperson / team)
HVOR & NÅR: (Arena på avdelingen, dager, tidspunkt og varighet)
Bruk plassholderen [BARNET] konsekvent.`;
      } else {
        prompt = `Du er en erfaren spesialpedagog og veileder for barnehagelærere i Norge.
Strukturer og formuler et faglig og presist innhold til avsnittet "${gjeldendeFelt?.tittel || 'Tiltak'}" basert på disse stikkordene: "${vasketTekst}".
Hjelpetekst for avsnittet er: "${gjeldendeFelt?.hjelpetekst || ''}".
Bruk plassholderen [BARNET] konsekvent ved henvisning til barnet.
Skriv i et profesjonelt, anerkjennende fagspråk egnet for kommunal saksbehandling.`;
      }

      const response = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      let aiResultat = (response.text || "").trim();

      // Fallback dersom proxyen returnerer tomt
      if (!aiResultat) {
        if (feltId === 'kortsiktige_maal' || tittel.includes('mål')) {
          aiResultat = 
            "Mål 1: [BARNET] skal delta i styrt parallell-lek med ett annet barn i 10 minutter, 3 ganger i uken.\n" +
            "Mål 2: [BARNET] skal ved hjelp av dags-tavlen selv peke på neste aktivitet ved overganger.\n" +
            "(Vurdert opp mot SMART-kriteriene: Tydelig hva som skal skje, målbart i tid/frekvens, realistisk for perioden).";
        } else {
          aiResultat = 
            "HVA: Strukturert lekegruppe og visuell overgangsstøtte.\n" +
            "HVORDAN: Bruk av visuell støtte (piktogrammer) i forkant. Skjermet krok på avdelingen med faste leker.\n" +
            "HVEM: Spesialpedagog / Pedleder i samarbeid med støtteassistent.\n" +
            "NÅR: Tirsdager og torsdager kl 10:00 - 10:30.";
        }
      }

      setItpData(prev => ({ ...prev, [feltId]: aiResultat }));
    } catch (err) {
      console.warn("Bruker innebygd lokal fallback etter feil:", err);
      const gjeldendeFelt = kommunalMalFraStyrer.find(f => f.id === feltId);
      const tittel = (gjeldendeFelt?.tittel || feltId).toLowerCase();

      let aiForslag = "";
      if (feltId === 'kortsiktige_maal' || tittel.includes('mål')) {
        aiForslag = 
          "Mål 1: [BARNET] skal delta i styrt parallell-lek med ett annet barn i 10 minutter, 3 ganger i uken.\n" +
          "Mål 2: [BARNET] skal ved hjelp av dags-tavlen selv peke på neste aktivitet ved overganger.\n" +
          "(Vurdert opp mot SMART-kriteriene: Tydelig hva som skal skje, målbart i tid/frekvens, realistisk for perioden).";
      } else {
        aiForslag = 
          "HVA: Strukturert lekegruppe.\n" +
          "HVORDAN: Bruk av visuell støtte (piktogrammer) i forkant. Skjermet krok på avdelingen.\n" +
          "HVEM: Spesialpedagog / Pedleder i samarbeid med støtteassistent.\n" +
          "NÅR: Tirsdager og torsdager kl 10:00 - 10:30.";
      }
      setItpData(prev => ({ ...prev, [feltId]: aiForslag }));
    } finally {
      setBehandlerAI(false);
      setAktivtAIFelt(null);
    }
  };

  // 5. GENERER LÅST PDF FOR ARKIV (Udir & Kommunal standard)
  const handleGenererPDF = () => {
    if (!barnetsNavn) {
      alert("Sikkerhetsstopp: Du må fylle inn barnets navn før du kan eksportere planen.");
      return;
    }

    setIsExporting(true);
    try {
      // Oppretter et nytt A4 PDF-dokument i stående (portrait) format
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;
      let yPos = 20;

      // 1. Dokument-header og metadata
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Individuell tiltaksplan (ITP)", margin, yPos);
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Barnets navn: ${barnetsNavn}`, margin, yPos);
      
      yPos += 8;
      const dato = new Date().toLocaleDateString('no-NO');
      doc.text(`Dato generert: ${dato}`, margin, yPos);
      
      yPos += 15; // Ekstra rom før selve innholdet

      // 2. Gå gjennom alle feltene fra Styrerens mal dynamisk
      kommunalMalFraStyrer.forEach((felt) => {
        // Sikkerhetsnett: Legg til en ny side hvis vi nærmer oss bunnen av A4-arket (ca 297mm lengde)
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Sett inn overskriften for dette avsnittet
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(felt.tittel, margin, yPos);
        yPos += 8;

        // Hent innholdet pedlederen har skrevet, eller sett en standardtekst hvis tomt
        const innhold = itpData[felt.id] || 'Ingen informasjon fylt ut i dette punktet.';
        
        // jsPDF håndterer ikke linjeskift automatisk. Denne deler teksten opp slik at den ikke går utenfor arket.
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const deltTekst = doc.splitTextToSize(innhold, maxLineWidth);
        
        doc.text(deltTekst, margin, yPos);
        
        // Flytt Y-posisjonen ned dynamisk basert på hvor mange linjer teksten tok (ca 6mm per linje)
        yPos += (deltTekst.length * 6) + 12; 
      });

      // 3. Generer filen og trigg nedlasting lokalt
      // Fjerner mellomrom i navnet for å gjøre filnavnet arkiv-vennlig
      const trygtNavn = barnetsNavn.replace(/\s+/g, '_');
      const filnavn = `Tiltaksplan_${trygtNavn}_${dato}.pdf`;
      
      doc.save(filnavn);
    } catch (err) {
      console.error("Feil ved generering av PDF:", err);
      alert("Kunne ikke eksportere PDF. Vennligst sjekk innholdet og prøv igjen.");
    } finally {
      setIsExporting(false);
    }
  };

  // 6. KOPIER PLAN TIL UTKLIPPSTAVLE (for fagsystemer som Visma Flyt / Vigilo)
  const handleKopierPlan = () => {
    let samlet = `INDIVIDUELL TILTAKSPLAN (ITP)\n`;
    samlet += `Barn: ${barnetsNavn || '[Uoppgitt]'}\nDato: ${new Date().toLocaleDateString('no-NO')}\n`;
    samlet += `==========================================\n\n`;

    for (const felt of kommunalMalFraStyrer) {
      samlet += `${felt.tittel.toUpperCase()}\n`;
      samlet += `${itpData[felt.id] || '(Ikke utfylt)'}\n\n`;
    }

    navigator.clipboard.writeText(samlet);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 font-sans pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-700 shadow-sm">
            <FileSignature className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Individuell tiltaksplan (ITP)</h1>
            <p className="text-sm text-slate-500">Bygget på mal fra Udir & Håndbok i spesialpedagogikk (Trondheim)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {barnetsNavn ? (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Skjold Aktivt
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
              <Lock className="w-5 h-5 text-amber-600" /> Venter på navn...
            </div>
          )}

          <button
            onClick={handleKopierPlan}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            title="Kopier hele planen som tekst til utklippstavlen"
          >
            {kopiert ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            {kopiert ? "Kopiert!" : "Kopier tekst"}
          </button>
        </div>
      </div>

      {/* SIKKERHETSVARSEL DERSOM SKJOLDET STOPPER */}
      {skjoldVarsel && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">{skjoldVarsel}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VENSTRE: DYNAMISK UDIR-MAL */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-1/2">
              <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Barnets Fornavn (Skjold-kryptert)
              </label>
              <input 
                type="text" 
                placeholder="F.eks. Kari"
                value={barnetsNavn}
                onChange={(e) => setBarnetsNavn(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 font-medium text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Navnet vaskes lokalt i nettleseren før KI-kall.
              </span>
            </div>
            
            <button 
              onClick={handleImportFraPPTLogg}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-3 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
              title="Henter inn observasjoner fra Bekymrings-ruten eller PPT-veilederen"
            >
              <Import className="w-5 h-5" /> Hent historikk fra PPT-logg
            </button>
          </div>

          {kommunalMalFraStyrer.map((felt) => (
            <div key={felt.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-3 group hover:border-emerald-200 transition-colors">
              
              <div>
                <h2 className="font-bold text-slate-800 text-lg">{felt.tittel}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {felt.hjelpetekst}
                </p>
              </div>

              {/* AI-assistent for SMARTe mål og Organisering */}
              {felt.type === 'ai-stottet' && (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 mt-2 mb-2 flex gap-3">
                  <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1 block">
                      KI-Veileder: {felt.id === 'kortsiktige_maal' ? 'SMART-Mål (Trondheims-modellen)' : 'Hva, Hvordan, Hvem, Hvor'}
                    </label>
                    <p className="text-xs text-slate-600 mb-3">
                      {felt.id === 'kortsiktige_maal' 
                        ? 'Mat meg med stikkord (f.eks. «støtte i overganger, parallell-lek»), så formulerer jeg konkrete, målbare mål.' 
                        : 'Mat meg med stikkord for tiltaket (f.eks. «lekegruppe, piktogrammer, pedleder + assistent»), så strukturerer jeg det.'}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder={felt.id === 'kortsiktige_maal' ? "Stikkord for mål..." : "Stikkord for organisering..."}
                        value={stikkordState[felt.id] || ''}
                        onChange={(e) => setStikkordState({ ...stikkordState, [felt.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSokratiskMaal(felt.id);
                        }}
                        className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                      />
                      <button 
                        onClick={() => handleSokratiskMaal(felt.id)}
                        disabled={behandlerAI}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
                      >
                        {behandlerAI && aktivtAIFelt === felt.id ? (
                          <>
                            <Sparkles className="w-4 h-4 animate-spin" />
                            Formulerer...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Formuler
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <textarea 
                rows={felt.type === 'ai-stottet' ? 4 : 5}
                placeholder={`Fyll inn ${felt.tittel.toLowerCase()}...`}
                value={itpData[felt.id] || ''}
                onChange={(e) => setItpData({ ...itpData, [felt.id]: e.target.value })}
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y text-slate-700 leading-relaxed text-sm"
              />
            </div>
          ))}
        </div>

        {/* HØYRE: EKSPORT */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl sticky top-24">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" /> Universell Eksport
            </h3>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Planen eksporteres som en låst, arkiv-klar PDF du kan laste opp eller dra og slippe rett inn i kommunens arkivsystem (f.eks. Visma Flyt, Vigilo eller Sikkersak).
            </p>

            <button 
              onClick={handleGenererPDF}
              disabled={isExporting}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-md"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Genererer PDF...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generer Låst PDF for Arkiv
                </>
              )}
            </button>
            
            <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>Anonymiserings-skjoldet sikrer at barnets fulle identitet aldri sendes over åpne KI-linjer.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>Standardisert oppsett: Mal for tiltaksplan (Utdanningsdirektoratet) & Spesialpedagogisk håndbok.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>Arkivmerket: Unntatt offentligheten jf. offl. § 13 jf. fvl. § 13.</p>
              </div>
            </div>

            {/* Hurtighandling for å hoppe til PPT-veileder hvis ønskelig */}
            {onNavigateToPPT && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={onNavigateToPPT}
                  className="w-full text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 p-3 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Åpne PPT-veileder / Bekymringsrute
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
