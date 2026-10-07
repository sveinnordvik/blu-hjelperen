import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  FileSignature, 
  BellRing, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  FileText, 
  Calendar,
  ChevronRight, 
  ShieldAlert, 
  X, 
  Send, 
  Eye, 
  Check,
  Edit3,
  Plus,
  Trash2,
  Download,
  Lock,
  FileUp,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AnsattSignering {
  id: number;
  navn: string;
  rolle: string;
  status: 'Signert' | 'Mangler';
  dato: string;
}

interface Kapittel {
  id: string;
  tittel: string;
  innhold: string;
}

interface MalDokument {
  id: string;
  tittel: string;
  kategori: string;
  paragraf: string;
  beskrivelse: string;
  filnavn: string;
  filStorrelse?: string;
  sistOppdatert: string;
  innholdTekst: string;
}

interface PersonalhandbokProps {
  onNavigate?: (tab: string) => void;
}

const Personalhandbok: React.FC<PersonalhandbokProps> = () => {
  // MOCK-DATA: Status på hvem som har signert årets personalhåndbok
  const [ansatte, setAnsatte] = useState<AnsattSignering[]>(() => {
    const saved = localStorage.getItem('styrern_personalhandbok_ansatte');
    return saved ? JSON.parse(saved) : [
      { id: 1, navn: 'Ingrid Solheim', rolle: 'Pedagogisk leder', status: 'Signert', dato: '15. aug 2026' },
      { id: 2, navn: 'Fatima Al-Zahra', rolle: 'Fagarbeider', status: 'Signert', dato: '16. aug 2026' },
      { id: 3, navn: 'Morten Hansen', rolle: 'Assistent', status: 'Mangler', dato: '-' },
      { id: 4, navn: 'Lise Moen', rolle: 'Pedagogisk leder', status: 'Signert', dato: '18. aug 2026' },
      { id: 5, navn: 'Lars Pettersen', rolle: 'Vikar', status: 'Mangler', dato: '-' },
    ];
  });

  // Håndbok metadata og innhold (kan redigeres inne i appen)
  const [handbokMeta, setHandbokMeta] = useState(() => {
    const saved = localStorage.getItem('styrern_handbok_meta');
    return saved ? JSON.parse(saved) : {
      tittel: 'Personalhåndbok 2026/2027 – Eventyrskogen Barnehage',
      versjon: 'v2.1',
      sistOppdatert: '15. aug 2026',
      opplastetFilnavn: 'Personalhandbok_Eventyrskogen_2026_v2.pdf',
      viktigeEndringer: [
        'Oppdaterte rutiner for smittevern (FHI 2026)',
        'Nye retningslinjer for bruk av mobiltelefon i avdelingene',
        'Revidert brannverninstruks og samlingsplass ved lekeskuret'
      ]
    };
  });

  // Kapitler i personalhåndboken
  const [kapitler, setKapitler] = useState<Kapittel[]>(() => {
    const saved = localStorage.getItem('styrern_handbok_kapitler');
    return saved ? JSON.parse(saved) : [
      {
        id: 'kap-1',
        tittel: 'Kapittel 1: Arbeidstid, vaktordninger og fravær',
        innhold: 'Kjernetiden i barnehagen er fra 09:30 til 14:30. Ved sykefravær skal styrer varsles senest kl 07:00 via Styrer\'n-appen eller SMS. Egenmeldingsdager skal registreres digitalt innen første arbeidsdag etter retur.'
      },
      {
        id: 'kap-2',
        tittel: 'Kapittel 2: Taushetsplikt og personvern (GDPR)',
        innhold: 'Alle ansatte er bundet av forvaltningslovens strenge taushetsplikt § 13 og Barnehageloven § 20. Bilder og videoer av barn skal utelukkende tas med barnehagens godkjente enheter og aldri lagres på private telefoner eller deles i private kanaler.'
      },
      {
        id: 'kap-3',
        tittel: 'Kapittel 3: Smittevern og hygiene',
        innhold: 'Retningslinjer følger FHI. Ved oppkast/diaré gjelder 48-timersregelen fra siste symptom. Barn og ansatte skal ha vært feberfrie i minst 24 timer uten febernedsettende preparater før retur til barnehagen.'
      },
      {
        id: 'kap-4',
        tittel: 'Kapittel 4: Brannverninstruks og evakuering',
        innhold: 'Rømningsveier skal til enhver tid holdes frie for barnevogner, akebrett og utstyr. Samlingsplass ved alarm er fotballbanen ved lekeskuret. Alle ansatte skal delta på 2 årlige brannvernøvelser (vår og høst).'
      },
      {
        id: 'kap-5',
        tittel: 'Kapittel 5: Psykososialt barnehagemiljø (§ 41) & Varsling',
        innhold: 'Alle som arbeider i barnehagen har plikt til å gripe inn og melde fra til styrer dersom et barn ikke har et trygt og godt barnehagemiljø. Ved mistanke om mobbing eller utestengelse igangsettes aktivitetsplan innen 5 virkedager.'
      }
    ];
  });

  // Styrers mal- og dokumentarkiv (Taushetserklæring, kontrakt, mm.)
  const [maler, setMaler] = useState<MalDokument[]>(() => {
    const saved = localStorage.getItem('styrern_malarkiv');
    return saved ? JSON.parse(saved) : [
      {
        id: 'mal-taushet',
        tittel: 'Taushetserklæring for ansatte og vikarer',
        kategori: 'Lovpålagt dokumentasjon',
        paragraf: 'Barnehageloven § 20 / Forvaltningsloven § 13',
        beskrivelse: 'Standard juridisk erklæring som alle ansatte og vikarer må undertegne før første arbeidsdag.',
        filnavn: 'Taushetserklaring_Standard_2026.pdf',
        filStorrelse: '320 KB',
        sistOppdatert: '28. sep 2026',
        innholdTekst: `EVENTYRSKOGEN BARNEHAGE - TAUSHETSERKLÆRING
Jfr. Barnehageloven § 20 og Forvaltningsloven §§ 13 til 13 f

Undertegnede forplikter seg herved til å bevare absolutt taushet om alle personlige forhold vedrørende barn, foresatte og kolleger som jeg får kjennskap til gjennom mitt arbeid i Eventyrskogen Barnehage.

Taushetsplikten gjelder:
1. Barns og familiers helsemessige, sosiale og personlige forhold.
2. Vedtak om spesialpedagogisk hjelp, PPT-saker og barnevern.
3. Observasjoner og konfidensielle samtaler i personalgruppen.

Taushetsplikten opphører ikke ved fratredelse av stillingen.
Brudd på taushetsplikten er straffbart etter straffeloven § 209.`
      },
      {
        id: 'mal-kontrakt',
        tittel: 'Standard Arbeidsavtale & Stillingsbeskrivelse',
        kategori: 'Arbeidsrett & Personal',
        paragraf: 'Arbeidsmiljøloven § 14-6',
        beskrivelse: 'Standardisert kontrakt for faste ansatte, midlertidige og tilkallingsvikarer med tariffbestemmelser.',
        filnavn: 'Arbeidsavtale_Standardmal_PBL.docx',
        filStorrelse: '480 KB',
        sistOppdatert: '15. aug 2026',
        innholdTekst: `ARBEIDSAVTALE - EVENTYRSKOGEN BARNEHAGE
Iht. Arbeidsmiljøloven § 14-6 og Hovedavtalen PBL

Partene inngår herved arbeidsavtale med vilkår om stillingsprosent, lønnsplassering, arbeidstid og pensjonsrettigheter.
Prøvetid er fastsatt til 6 måneder med 14 dagers gjensidig oppsigelsesfrist i prøvetiden.`
      },
      {
        id: 'mal-onboarding',
        tittel: 'Innfasing og Sjekkliste for nyansatte / vikarer',
        kategori: 'Rutiner & HMS',
        paragraf: 'Internkontrollforskriften',
        beskrivelse: 'Sjekkliste for første uke på avdeling: omvisning, branninstruks, nøkkelkort og pedagogisk intro.',
        filnavn: 'Onboarding_Nyansatt_Sjekkliste.pdf',
        filStorrelse: '210 KB',
        sistOppdatert: '01. sep 2026',
        innholdTekst: `SJEKKLISTE VED NYANSETTELSER
Dag 1:
- Fremvisning og verifisering av politiattest (§ 30)
- Signering av taushetserklæring
- Omvisning og brannverninstruks
- Tildeling av fadder på basen`
      }
    ];
  });

  // Modaltilstander
  const [visVisModal, setVisVisModal] = useState(false);
  const [visRedigerModal, setVisRedigerModal] = useState(false);
  const [visOpplastModal, setVisOpplastModal] = useState(false);
  const [redigererMal, setRedigererMal] = useState<MalDokument | null>(null);
  const [purringSendtMelding, setPurringSendtMelding] = useState<string | null>(null);

  // Kladde-tilstand for redigering av personalhåndboken
  const [kladdTittel, setKladdTittel] = useState(handbokMeta.tittel);
  const [kladdVersjon, setKladdVersjon] = useState(handbokMeta.versjon);
  const [kladdKapitler, setKladdKapitler] = useState<Kapittel[]>(kapitler);
  const [krevNySignering, setKrevNySignering] = useState(false);

  useEffect(() => {
    localStorage.setItem('styrern_personalhandbok_ansatte', JSON.stringify(ansatte));
  }, [ansatte]);

  useEffect(() => {
    localStorage.setItem('styrern_handbok_meta', JSON.stringify(handbokMeta));
  }, [handbokMeta]);

  useEffect(() => {
    localStorage.setItem('styrern_handbok_kapitler', JSON.stringify(kapitler));
  }, [kapitler]);

  useEffect(() => {
    localStorage.setItem('styrern_malarkiv', JSON.stringify(maler));
  }, [maler]);

  // Utregning av statistikk
  const totaltAnsatte = ansatte.length;
  const signertAntall = ansatte.filter(a => a.status === 'Signert').length;
  const manglerAntall = totaltAnsatte - signertAntall;
  const prosentFullfort = Math.round((signertAntall / totaltAnsatte) * 100);

  // Send purring til ansatte som mangler signering
  const handleSendPurring = () => {
    const somMangler = ansatte.filter(a => a.status === 'Mangler').map(a => a.navn).join(', ');
    setPurringSendtMelding(`Automatisk SMS- og e-postpurring sendt til: ${somMangler}`);
    setTimeout(() => {
      setPurringSendtMelding(null);
    }, 5000);
  };

  // Toggle signaturstatus ved klikk i tabellen
  const toggleSignatur = (id: number) => {
    setAnsatte(prev => prev.map(a => {
      if (a.id === id) {
        const nyStatus = a.status === 'Signert' ? 'Mangler' : 'Signert';
        const nyDato = nyStatus === 'Signert' 
          ? new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-';
        return { ...a, status: nyStatus, dato: nyDato };
      }
      return a;
    }));
  };

  // Åpne redigering av personalhåndboken
  const handleApneRedigering = () => {
    setKladdTittel(handbokMeta.tittel);
    setKladdVersjon(handbokMeta.versjon);
    setKladdKapitler([...kapitler]);
    setKrevNySignering(false);
    setVisRedigerModal(true);
  };

  // Lagre endringer fra tekst-editoren
  const handleLagreRedigertHandbok = () => {
    const iDag = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    setHandbokMeta(prev => ({
      ...prev,
      tittel: kladdTittel,
      versjon: kladdVersjon,
      sistOppdatert: iDag
    }));
    setKapitler([...kladdKapitler]);

    if (krevNySignering) {
      setAnsatte(prev => prev.map(a => ({ ...a, status: 'Mangler', dato: '-' })));
      setPurringSendtMelding(`Håndbok oppdatert til ${kladdVersjon}! Alle ansatte må signere på nytt.`);
    } else {
      setPurringSendtMelding(`Endringer i personalhåndboken er lagret.`);
    }

    setVisRedigerModal(false);
    setTimeout(() => setPurringSendtMelding(null), 4000);
  };

  // Generer og last ned personalhåndboken som PDF
  const handleLastNedHandbokPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(handbokMeta.tittel.toUpperCase(), 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text(`Versjon: ${handbokMeta.versjon}  |  Sist oppdatert: ${handbokMeta.sistOppdatert}`, 15, 31);

      let y = 48;
      kapitler.forEach(kap => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(kap.tittel, 15, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const splitText = doc.splitTextToSize(kap.innhold, 180);
        doc.text(splitText, 15, y);
        y += splitText.length * 5.5 + 8;
      });

      doc.save(`Personalhandbok_${handbokMeta.versjon}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  // Last ned en spesifikk mal (f.eks. Taushetserklæring)
  const handleLastNedMalPdf = (mal: MalDokument) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(mal.tittel.toUpperCase(), 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text(`Jfr. ${mal.paragraf}  |  Dato: ${mal.sistOppdatert}`, 15, 31);

      let y = 50;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);

      const splitLines = doc.splitTextToSize(mal.innholdTekst, 180);
      doc.text(splitLines, 15, y);

      y += splitLines.length * 6 + 15;
      if (y < 240) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 30, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('Dato: ________________________', 20, y + 18);
        doc.text('Underskrift: _________________________________________', 85, y + 18);
      }

      doc.save(`${mal.tittel.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. TOPP: Tittel og Handlingsknapper */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <BookOpen className="text-indigo-600" size={28} />
            <span>Dynamisk Personalhåndbok & Malarkiv</span>
          </h2>
          <p className="text-slate-600 mt-1">
            Rediger håndboken direkte i appen, last opp nye versjoner med drag-and-drop, og administrer standardmaler som taushetserklæring.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleApneRedigering}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm shadow-sm cursor-pointer"
          >
            <Edit3 size={16} />
            <span>Rediger håndbok i appen</span>
          </button>

          <button 
            onClick={() => setVisOpplastModal(true)}
            className="flex items-center space-x-2 bg-white text-indigo-700 px-4 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200 font-semibold text-sm cursor-pointer shadow-xs"
          >
            <Upload size={16} />
            <span>Last opp fil (Drag & Drop)</span>
          </button>
        </div>
      </div>

      {purringSendtMelding && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{purringSendtMelding}</div>
        </div>
      )}

      {/* 2. HOVEDSEKSJON: Venstre kolonne (Aktiv håndbok & status) + Høyre kolonne (Kvitteringsmatrise) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VENSTRE: Aktiv Håndbok & Oppsummering */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-start space-x-4 mb-5">
              <div className="bg-[#1e1b4b] p-3 rounded-xl shadow-inner text-white">
                <FileText size={30} className="text-indigo-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-800">{handbokMeta.tittel}</h3>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">{handbokMeta.versjon}</span>
                  <span>•</span>
                  <span>Oppdatert {handbokMeta.sistOppdatert}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Viktige temaer i årets utgave:</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                {handbokMeta.viktigeEndringer.map((endring: string, idx: number) => (
                  <li key={idx}>{endring}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button 
                onClick={() => setVisVisModal(true)}
                className="flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Eye size={14} />
                <span>Les i appen</span>
              </button>
              <button 
                onClick={handleLastNedHandbokPdf}
                className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Download size={14} />
                <span>Last ned PDF</span>
              </button>
            </div>
          </div>

          {/* Varslingsboks hvis noen mangler */}
          {manglerAntall > 0 && (
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={24} />
                <div>
                  <h3 className="text-base font-bold text-amber-800">Manglende signaturer!</h3>
                  <p className="text-sm text-amber-700 mt-1 mb-4 leading-relaxed">
                    {manglerAntall} ansatte har ikke kvittert for å ha lest årets personalhåndbok ({prosentFullfort}% fullført).
                  </p>
                  <button 
                    onClick={handleSendPurring}
                    className="flex items-center justify-center space-x-2 w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm shadow-sm cursor-pointer"
                  >
                    <BellRing size={16} />
                    <span>Send automatisk purring</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* HØYRE: Kvitteringsmatrise (Tabell over ansattes signaturer) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <FileSignature size={20} className="text-indigo-600" />
                <span>«Lest og forstått»-kvitteringer</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lovmessig dokumentasjon på at ansatte har gjort seg kjent med barnehagens interne rutiner.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold uppercase">Signeringsgrad</span>
                <p className="text-base font-bold text-indigo-700">{signertAntall} av {totaltAnsatte} ({prosentFullfort}%)</p>
              </div>
              <div className="w-16 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${prosentFullfort}%` }}></div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ansatt</th>
                  <th className="px-6 py-4 font-semibold">Rolle</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Signert dato</th>
                  <th className="px-6 py-4 font-semibold text-right">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ansatte.map((ansatt) => (
                  <tr key={ansatt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{ansatt.navn}</td>
                    <td className="px-6 py-4 text-slate-600">{ansatt.rolle}</td>
                    <td className="px-6 py-4">
                      {ansatt.status === 'Signert' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 size={13} />
                          <span>Lest & signert</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <AlertTriangle size={13} />
                          <span>Mangler</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{ansatt.dato}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleSignatur(ansatt.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                          ansatt.status === 'Signert'
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        {ansatt.status === 'Signert' ? 'Nullstill' : 'Marker som signert'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 3. NEDRE SEKSJON: STYRERS MAL- OG DOKUMENTARKIV (inkl. Taushetserklæring) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Lock size={20} className="text-indigo-600" />
              <span>Styrers Mal- og Dokumentarkiv</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Her kan du redigere ordlyden i barnehagens standardmaler, laste ned offisielle PDF-vedlegg eller slippe inn oppdaterte filer med drag-and-drop.
            </p>
          </div>

          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-100">
            {maler.length} aktive standardmaler
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {maler.map((mal) => (
            <div key={mal.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                    {mal.paragraf}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{mal.sistOppdatert}</span>
                </div>

                <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">{mal.tittel}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{mal.beskrivelse}</p>

                <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 mb-4 truncate">
                  <FileText size={14} className="text-indigo-600 shrink-0" />
                  <span className="truncate font-semibold">{mal.filnavn}</span>
                  {mal.filStorrelse && <span className="text-slate-400 text-[10px] ml-auto shrink-0">{mal.filStorrelse}</span>}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRedigererMal(mal)}
                    className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Rediger tekst</span>
                  </button>
                  <button
                    onClick={() => handleLastNedMalPdf(mal)}
                    className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Last ned PDF</span>
                  </button>
                </div>

                {/* Hurtig-slippsone for oppdatering av denne malen */}
                <DropzoneLiten 
                  onFileDrop={(filnavn, storrelse) => {
                    setMaler(prev => prev.map(m => m.id === mal.id ? {
                      ...m,
                      filnavn: filnavn,
                      filStorrelse: storrelse,
                      sistOppdatert: new Date().toLocaleDateString('no-NO')
                    } : m));
                    setPurringSendtMelding(`Oppdatert mal lastet opp for: ${mal.tittel}`);
                    setTimeout(() => setPurringSendtMelding(null), 3500);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL 1: LES PERSONALHÅNDBOKEN I APPEN --- */}
      {visVisModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#1e1b4b] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText size={24} className="text-indigo-300" />
                <div>
                  <h3 className="font-bold text-lg text-white leading-tight">{handbokMeta.tittel}</h3>
                  <span className="text-xs text-indigo-200">Versjon {handbokMeta.versjon} • Gjeldende for alle ansatte</span>
                </div>
              </div>
              <button 
                onClick={() => setVisVisModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
              {kapitler.map((kap) => (
                <div key={kap.id} className="border-b border-slate-200 pb-5 last:border-b-0">
                  <h4 className="text-base font-bold text-slate-900 mb-2">{kap.tittel}</h4>
                  <p className="whitespace-pre-line">{kap.innhold}</p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleLastNedHandbokPdf}
                className="flex items-center space-x-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
              >
                <Download size={14} />
                <span>Last ned som PDF</span>
              </button>
              <button 
                onClick={() => setVisVisModal(false)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
              >
                Lukk visning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: REDIGER PERSONALHÅNDBOKEN INNE I APPEN --- */}
      {visRedigerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#1e1b4b] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Edit3 size={24} className="text-indigo-300" />
                <div>
                  <h3 className="font-bold text-lg text-white">Rediger Personalhåndbok i appen</h3>
                  <span className="text-xs text-indigo-200">Endre kapitler, instrukser og juridiske bestemmelser</span>
                </div>
              </div>
              <button 
                onClick={() => setVisRedigerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tittel og versjon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dokumenttittel</label>
                  <input 
                    type="text"
                    value={kladdTittel}
                    onChange={(e) => setKladdTittel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Versjonsnummer</label>
                  <input 
                    type="text"
                    value={kladdVersjon}
                    onChange={(e) => setKladdVersjon(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Kapitler */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Håndbokens kapitler</h4>
                  <button
                    onClick={() => {
                      const nyttNummer = kladdKapitler.length + 1;
                      setKladdKapitler(prev => [
                        ...prev,
                        {
                          id: `kap-${Date.now()}`,
                          tittel: `Kapittel ${nyttNummer}: Nytt tema`,
                          innhold: 'Skriv instruks eller retningslinje her...'
                        }
                      ]);
                    }}
                    className="flex items-center space-x-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Legg til kapittel</span>
                  </button>
                </div>

                {kladdKapitler.map((kap, index) => (
                  <div key={kap.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        value={kap.tittel}
                        onChange={(e) => {
                          const nyVerdi = e.target.value;
                          setKladdKapitler(prev => prev.map(k => k.id === kap.id ? { ...k, tittel: nyVerdi } : k));
                        }}
                        className="w-full max-w-lg font-bold text-slate-800 text-sm px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none"
                      />
                      {kladdKapitler.length > 1 && (
                        <button
                          onClick={() => setKladdKapitler(prev => prev.filter(k => k.id !== kap.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="Fjern kapittel"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <textarea 
                      value={kap.innhold}
                      rows={3}
                      onChange={(e) => {
                        const nyTekst = e.target.value;
                        setKladdKapitler(prev => prev.map(k => k.id === kap.id ? { ...k, innhold: nyTekst } : k));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>

              {/* Valg for re-signering */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-3">
                <input 
                  type="checkbox"
                  id="reSignerCheck"
                  checked={krevNySignering}
                  onChange={(e) => setKrevNySignering(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="reSignerCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Krev ny signering fra alle ansatte (nullstiller tidligere kvitteringer og sender varsel)
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button 
                onClick={() => setVisRedigerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                onClick={handleLagreRedigertHandbok}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Save size={16} />
                <span>Lagre endringer i håndbok</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: LAST OPP NY VERSJON MED DRAG AND DROP --- */}
      {visOpplastModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#1e1b4b] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Upload size={22} className="text-indigo-300" />
                <h3 className="font-bold text-base text-white">Last opp ny personalhåndbok (PDF)</h3>
              </div>
              <button 
                onClick={() => setVisOpplastModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600">
                Slipp inn ferdig personalhåndbok fra PDF eller Word. Dette erstatter gjeldende dokument i portalen.
              </p>

              <HandbokDropzone 
                onFileSelected={(fileName) => {
                  const iDag = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
                  setHandbokMeta(prev => ({
                    ...prev,
                    opplastetFilnavn: fileName,
                    sistOppdatert: iDag
                  }));
                  setVisOpplastModal(false);
                  setPurringSendtMelding(`Ny fil "${fileName}" er lastet opp som aktiv personalhåndbok!`);
                  setTimeout(() => setPurringSendtMelding(null), 4000);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: REDIGER SPESIFIKK MAL (F.EKS. TAUSHETSERKLÆRING) --- */}
      {redigererMal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#1e1b4b] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock size={22} className="text-indigo-300" />
                <div>
                  <h3 className="font-bold text-base text-white">Rediger mal: {redigererMal.tittel}</h3>
                  <span className="text-xs text-indigo-200">{redigererMal.paragraf}</span>
                </div>
              </div>
              <button 
                onClick={() => setRedigererMal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maltittel</label>
                <input 
                  type="text"
                  value={redigererMal.tittel}
                  onChange={(e) => setRedigererMal({ ...redigererMal, tittel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Juridisk ordlyd og innhold</label>
                <textarea 
                  value={redigererMal.innholdTekst}
                  rows={12}
                  onChange={(e) => setRedigererMal({ ...redigererMal, innholdTekst: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button 
                onClick={() => setRedigererMal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                onClick={() => {
                  setMaler(prev => prev.map(m => m.id === redigererMal.id ? {
                    ...redigererMal,
                    sistOppdatert: new Date().toLocaleDateString('no-NO')
                  } : m));
                  setRedigererMal(null);
                  setPurringSendtMelding(`Maldokument "${redigererMal.tittel}" er oppdatert.`);
                  setTimeout(() => setPurringSendtMelding(null), 3500);
                }}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Save size={16} />
                <span>Lagre mal</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Hjelpekomponent for Drag-and-Drop opplasting av personalhåndbok
const HandbokDropzone: React.FC<{ onFileSelected: (name: string) => void }> = ({ onFileSelected }) => {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0].name);
    }
  };

  return (
    <div>
      <input 
        ref={inputRef}
        type="file" 
        accept=".pdf,.docx,.doc" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelected(e.target.files[0].name);
          }
        }}
        className="hidden" 
      />
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
          isOver ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50'
        }`}
      >
        <div className="p-3 bg-white rounded-full shadow-xs text-indigo-600 mb-3">
          <FileUp size={28} />
        </div>
        <p className="text-sm font-bold text-slate-800">Dra og slipp ny personalhåndbok her</p>
        <p className="text-xs text-slate-500 mt-1">Støtter PDF, Word (.docx) • Maks 25 MB</p>
      </div>
    </div>
  );
};

// Liten hurtig-drag-and-drop for enkeltmaler
const DropzoneLiten: React.FC<{ onFileDrop: (navn: string, str: string) => void }> = ({ onFileDrop }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input 
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const f = e.target.files[0];
            const sz = f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB';
            onFileDrop(f.name, sz);
          }
        }}
        className="hidden"
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const f = e.dataTransfer.files[0];
            const sz = f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB';
            onFileDrop(f.name, sz);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-lg p-2 text-center transition cursor-pointer text-[11px] font-semibold ${
          dragActive ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-white'
        }`}
      >
        <span>Slipp oppdatert malfil her for å erstatte</span>
      </div>
    </div>
  );
};

export default Personalhandbok;
