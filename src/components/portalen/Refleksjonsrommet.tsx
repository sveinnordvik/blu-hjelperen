import React, { useState, useRef, useEffect } from 'react';
import { 
  BrainCircuit, Send, User, Sparkles, MessageSquare, 
  Lightbulb, ShieldAlert, ArrowRight, Loader2
} from 'lucide-react';

export default function Refleksjonsrommet() {
  // Chat-historikken. Starter med en innledende velkomstmelding fra KI-veilederen.
  const [meldinger, setMeldinger] = useState([
    {
      id: 1,
      rolle: 'ki',
      tekst: 'Hei! Som din digitale sparringspartner i Refleksjonsrommet er jeg her for å hjelpe deg med å reflektere rundt lederrollen, personalveiledning eller foreldresamarbeid. Hva står du i akkurat nå, som du ønsker å drøfte før du tar det videre?'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const meldingerSluttRef = useRef<HTMLDivElement>(null);

  // Auto-scroll til bunnen når det kommer nye meldinger
  useEffect(() => {
    meldingerSluttRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meldinger]);

  // Ferdige "Snarveier" for å fjerne tidstyver ved skriving
  const hurtigTemaer = [
    "En ansatt bryter inn og styrer barnas lek for mye.",
    "Utfordrende foreldresamtale om grensesetting.",
    "Ulikt syn på medvirkning og risikolek på basen."
  ];

  const handleSend = async (tekstSomSkalSendes?: string) => {
    const tekst = tekstSomSkalSendes || input;
    if (!tekst.trim()) return;

    // 1. Legg brukerens melding i chatten
    const nyBrukerMelding = { id: Date.now(), rolle: 'pedleder', tekst: tekst };
    setMeldinger(prev => [...prev, nyBrukerMelding as any]);
    setInput('');
    setIsTyping(true);

    // 2. Klargjør System Prompt (Den hemmelige instruksen til KI-en)
    const systemPrompt = `
      Du er en sokratisk veileder i Refleksjonsrommet for en pedagogisk leder i en norsk barnehage. 
      Din oppgave er ALDRI å gi direkte råd, fasit eller løsninger. Du skal utelukkende 
      bruke anerkjennende kommunikasjon og stille åpne, utforskende spørsmål som får 
      pedlederen til å reflektere over sin egen praksis, ledelsesrolle og personalets 
      handlingsalternativer. 
      Forankre gjerne spørsmålene subtilt i Rammeplanen (f.eks. barns medvirkning, 
      lekens egenverdi, eller personalets rolle som støttespillere).
      Hold svarene dine korte (maks 2-3 setninger) og avslutt alltid med et reflekterende spørsmål.
      
      Her er pedlederens siste innspill: "${tekst}"
    `;

    // 3. Simulerer kall til pedlederAI i Firebase (Byttes ut med faktisk API-kall senere)
    setTimeout(() => {
      let kiSvar = "";
      
      // Enkel simulering for demonstrasjonen basert på stikkord
      if (tekst.toLowerCase().includes("lek")) {
        kiSvar = "Det høres ut som du observerer at personalets inngripen påvirker barnas eierskap til leken. Hva tror du de voksne forsøker å oppnå når de går inn og styrer situasjonen?";
      } else if (tekst.toLowerCase().includes("foreldre")) {
        kiSvar = "Foreldresamarbeid rundt grensesetting kan være krevende når forventningene spriker. Hvordan kan du møte foreldrenes bekymring på en anerkjennende måte, samtidig som du trygger dem på barnehagens faglige plattform?";
      } else {
        kiSvar = "Det er en spennende problemstilling som krever tydelig pedagogisk ledelse. Hvilke handlingsalternativer ser du for deg i den neste situasjonen som oppstår på avdelingen, og hvordan kan du invitere personalet med i den refleksjonen?";
      }

      setMeldinger(prev => [...prev, { id: Date.now() + 1, rolle: 'ki', tekst: kiSvar } as any]);
      setIsTyping(false);
    }, 1800);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 font-sans h-[85vh]">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-700">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Refleksjonsrommet</h1>
            <p className="text-slate-500">Refleksjonsrom for pedagogisk ledelse og personalveiledning</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <ShieldAlert className="w-4 h-4 text-amber-500" /> Husk: Bruk fiktive navn
        </div>
      </div>

      {/* CHAT-OMRÅDE & HURTIGVALG */}
      <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Selve chatte-historikken */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {meldinger.map((msg: any) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.rolle === 'pedleder' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.rolle === 'pedleder' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                  msg.rolle === 'pedleder' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-emerald-600 border-emerald-100'
                }`}>
                  {msg.rolle === 'pedleder' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>

                {/* Snakkeboble */}
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.rolle === 'pedleder' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.tekst}
                </div>
              </div>
            </div>
          ))}

          {/* Laste-animasjon når KI tenker */}
          {isTyping && (
            <div className="flex justify-start w-full">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white text-emerald-600 border border-emerald-100 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={meldingerSluttRef} />
        </div>

        {/* INPUT-OMRÅDE MED HURTIGVALG */}
        <div className="p-6 bg-white border-t border-slate-100">
          
          {/* Snarveier (vises kun hvis det ikke er skrevet noe ennå) */}
          {meldinger.length === 1 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Start en refleksjon raskt
              </p>
              <div className="flex flex-wrap gap-2">
                {hurtigTemaer.map((tema, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(tema)}
                    className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {tema} <ArrowRight className="w-3 h-3 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tekstfelt */}
          <div className="flex gap-3">
            <textarea 
              rows={2}
              placeholder="Beskriv situasjonen eller dilemmaet du står i..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm bg-slate-50"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className={`px-6 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
                input.trim() && !isTyping
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3">
            Samtalen lagres ikke i noe arkiv. Rommet tømmes når du bytter fane.
          </p>
        </div>

      </div>
    </div>
  );
}
