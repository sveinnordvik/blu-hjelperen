import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles,
  ShieldCheck,
  Users,
  AlertCircle
} from 'lucide-react';

interface Melding {
  id: number;
  avsender: 'bruker' | 'ai';
  tekst: string;
}

const getAIResponse = (sporsmal: string): string => {
  const q = sporsmal.toLowerCase();

  if (q.includes('personalsamtale') || q.includes('fravær') || q.includes('syk')) {
    return `### Veiledning: Forberedelse til samtale om høyt fravær

Som styrer er du underlagt omsorgs- og tilretteleggingsplikten etter Arbeidsmiljøloven § 4-6, samtidig som du må ivareta barnehagens drift og barnas rett til et stabilt miljø.

**Struktur for samtalen:**
1. **Åpning & rammesetting:** Vær tydelig på at samtalen har som mål å finne ut hvordan barnehagen best kan tilrettelegge og støtte den ansatte tilbake i stabil drift.
2. **Faktaorientert fremstilling:** Vis til konkrete fraværsdager/perioder uten å være bebreidende. F.eks.: *"Vi ser at du har hatt 4 egenmeldingsperioder og 2 sykemeldinger de siste 4 månedene."*
3. **Kartlegging av årsaker:** Spør åpent: *"Er det forhold på arbeidsplassen, i barnegruppen eller i oppgavene som påvirker helsen din?"*
4. **Tilrettelegging & tiltak:** Vurder midlertidig endring i vaktplan, avlastning på tunge løft, eller skjermet tid for planlegging.
5. **Oppsummering og skriftlig oppfølgingsplan:** Avtal evalueringsmøte om 3–4 uker. Signer referat begge parter.`;
  }

  if (q.includes('43') || q.includes('mobbing') || q.includes('psykososialt') || q.includes('utrygt')) {
    return `### Prosedyre ved § 43-varsel og psykososialt barnehagemiljø (Barnehageloven kap. VIII)

Barnehageloven § 41, § 42 og § 43 stiller strenge, lovfestede krav til barnehagens aktivitetsplikt:

**1. Skjerpet aktivitetsplikt (§ 43):**
Dersom en ansatt mistenkes for å krenke et barn (psykisk, fysisk eller verbalt), skal styrer varsles **umiddelbart**. Styrer har plikt til å varsle barnehageeier og kommunen.

**2. Stoppe- og gripe inn-plikt (§ 42):**
Alle ansatte skal gripe inn mot krenkelser som mobbing, utestenging og vold.

**3. Undersøkelsesplikt:**
Styrer skal straks iverksette undersøkelser. Hør barnets stemme, snakk med ansatte og foreldre.

**4. Aktivitetsplan (Lovkrav):**
Det skal lages en skriftlig aktivitetsplan som inneholder:
- Hvilket problem tiltakene skal løse
- Hvilke konkrete tiltak som iverksettes
- Hvem som er ansvarlig for gjennomføring
- Dato for evaluering`;
  }

  if (q.includes('tilsyn') || q.includes('dokumentasjon') || q.includes('internkontroll') || q.includes('avvik')) {
    return `### Krav til dokumentasjon ved kommunalt tilsyn & HMS

Når kommunens barnehagemyndighet eller Mattilsynet/Brannvesenet kommer på tilsyn, etterspør de dokumentasjon på at barnehagens internkontrollsystem (IK) er i **aktiv bruk**, ikke bare en perm i hyllen.

**Dette må du ha klart:**
1. **Bemannings- og pedagognorm:** Vaktplaner og timelister som dokumenterer oppfyllelse av § 25 og § 26 i kjernetiden.
2. **Avvikslogg (HMS):** Dokumentasjon på at meldte avvik lukkes med konkrete tiltak, dato og ansvarlig person.
3. **Risikovurderinger:** Årlig lekeplasskontroll, brannvernøvelser (minst to årlige) og IK-mat temperaturlogger.
4. **Brukermedvirkning:** Referater fra Samarbeidsutvalget (SU) og foreldreråd.`;
  }

  return `### Juridisk og administrativ vurdering

Takk for henvendelsen, Karoline.

1. **Forankring i Barnehageloven og Rammeplanen:**
Tiltaket må alltid vurderes ut fra **barnets beste** (§ 1) og prinsippet om forsvarlig pedagogisk virksomhet.

2. **Administrativ oppfølging:**
Dokumenter vurderingen i barnehagens styringssystem. Involver pedagogiske ledere på avdelingsmøtet for å sikre felles forståelse og forankring i personalgruppen.

3. **Styrerens handlingsrom:**
Dersom dette berører tariffavtaler (f.eks. PBL eller KS) eller endring i ansettelsesforhold, anbefales det å kontakte barnehageeier eller juridisk rådgivning før endelig vedtak fattes.`;
};

const StyrerAI: React.FC = () => {
  const [input, setInput] = useState('');
  const [meldinger, setMeldinger] = useState<Melding[]>([
    { 
      id: 1, 
      avsender: 'ai', 
      tekst: 'Hei, Karoline! Jeg er din digitale sparringspartner for barnehageledelse, personalhåndtering og lovverk. Hvordan kan jeg hjelpe deg med å fjerne tidstyver eller løse et dilemma i dag?' 
    }
  ]);

  // Hurtigvalg for vanlige problemstillinger
  const forslag = [
    { tekst: 'Hjelp meg å forberede en vanskelig personalsamtale om høyt fravær.', ikon: Users },
    { tekst: 'Hva er den nøyaktige prosedyren ved § 43-varsel (mobbing)?', ikon: AlertCircle },
    { tekst: 'Krav til dokumentasjon av avvik ved tilsyn?', ikon: ShieldCheck },
  ];

  const sendMelding = (tekst: string) => {
    if (!tekst.trim()) return;
    
    // Legg til brukerens melding
    const nyMelding: Melding = { id: Date.now(), avsender: 'bruker', tekst };
    setMeldinger(prev => [...prev, nyMelding]);
    setInput('');
    
    // Simulerer at KI tenker og svarer med faglig veiledning
    setTimeout(() => {
      const aiSvar = getAIResponse(tekst);
      setMeldinger(prev => [...prev, {
        id: Date.now() + 1,
        avsender: 'ai',
        tekst: aiSvar
      }]);
    }, 700);
  };

  return (
    <div className="flex flex-col h-[800px] max-h-[85vh] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-[#1e1b4b] p-6 text-white flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-inner">
            <Bot size={28} className="text-indigo-100" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <span>Styrer AI</span>
              <Sparkles size={16} className="text-amber-400" />
            </h2>
            <p className="text-indigo-200 text-sm">Din juridiske og administrative sparringspartner</p>
          </div>
        </div>
      </div>

      {/* CHAT-OMRÅDET */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {meldinger.map((msg) => (
          <div key={msg.id} className={`flex ${msg.avsender === 'bruker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.avsender === 'bruker' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${
                msg.avsender === 'bruker' 
                  ? 'bg-emerald-500 text-white ml-4' 
                  : 'bg-indigo-100 text-indigo-700 mr-4'
              }`}>
                {msg.avsender === 'bruker' ? <User size={20} /> : <Bot size={20} />}
              </div>

              {/* Tekstboble */}
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                msg.avsender === 'bruker'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
              }`}>
                {msg.tekst}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* INPUT-OMRÅDET */}
      <div className="p-6 bg-white border-t border-slate-200">
        
        {/* Forslags-knapper (Synlig kun hvis chatten er kort) */}
        {meldinger.length < 5 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {forslag.map((f, index) => (
              <button 
                key={index}
                onClick={() => sendMelding(f.tekst)}
                className="flex items-center space-x-2 bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
              >
                <f.ikon size={14} />
                <span>{f.tekst}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tekstfelt */}
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMelding(input);
              }
            }}
            placeholder="Beskriv en situasjon, et regelverk du er usikker på, eller be om en mal..."
            className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-[60px] text-sm text-slate-700 shadow-inner"
          />
          <button 
            onClick={() => sendMelding(input)}
            className="absolute right-3 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Husk å anonymisere personopplysninger
          </span>
        </div>
      </div>

    </div>
  );
};

export default StyrerAI;
