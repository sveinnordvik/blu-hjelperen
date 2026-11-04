import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, LifeBuoy, Loader2, Info, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { callGoogleAIProxy } from '../../services/geminiService';

export const vikarSystemPrompt = `
Du er "Vikar-AI Nødhjelp", en hyper-praktisk, direkte og trygghets-skapende assistent for vikarer i en norsk barnehage.
Vikarene har ofte lite erfaring og står midt i kaotiske situasjoner. Din oppgave er å gi dem umiddelbar, praktisk hjelp.

REGLER:
1. INGEN pedagogisk svada, filosofi eller lange innledninger. Gå rett på sak.
2. Hvis spørsmålet handler om uhell (kroppsvæsker, vått tøy), konflikter eller rutiner: Gi en kort, konkret 1-2-3 smørbrødliste for hva vikaren skal gjøre FYSISK.
3. Sikkerhetsregel: Be alltid vikaren om å si ifra til en fast ansatt hvis de må forlate barnegruppa (f.eks. for å gå på badet med et barn) eller ved personskade.
4. Scripting: Fortell nøyaktig hva vikaren kan si til barnet med hermetegn.
5. Hold tonen rolig, tydelig og oppmuntrende, som en erfaren fagarbeider som tar styringen.
`;

/**
 * Intelligent lokal beredskapsmotor for barnehage-vikarer.
 * Sikrer at vikaren ALLTID får konkrete 1-2-3 fysiske handlingstrinn,
 * selv om Gemini API skulle være offline, oppleve kvotebegrensning eller mangle kreditt.
 */
export function getVikarPraktiskNodhjelp(tekst: string): string {
  const q = tekst.toLowerCase();

  // Scenario 1: Uhell / tiss / våte klær / støvler
  if (
    q.includes('tiss') || 
    q.includes('støvle') || 
    q.includes('dress') || 
    q.includes('våt') || 
    q.includes('bæsj') || 
    q.includes('uhell') || 
    q.includes('skifte')
  ) {
    return (
      "1. **Si ifra til kollega (Sikkerhetsregel):** Få øyekontakt med en fast ansatt og si: «Jeg tar med meg [barnet] inn for å skifte etter et uhell i dressen, så du har oversikten her ute.»\n\n" +
      "2. **Behold roen og skjerm barnet:** Si til barnet med et smil: «Oj, her kom det visst litt tiss! Det gjør ingenting, kom så går vi inn og ordner det sammen.» Ikke gjør noe stort nummer ut av det foran de andre barna.\n\n" +
      "3. **Av med det våte i gangen:** Ta av våt dress og støvler med én gang dere kommer inn slik at barnet ikke blir kaldt. Hjelp barnet inn på badet og vask med lunkent vann.\n\n" +
      "4. **Skift og tøm støvler:** Finn rent skiftetøy i barnets hylle/kurv (ull/stillongs, truse og tørre sokker). Tøm eventuelt tiss i støvlene rett i toalettet, skyll lett og sett dem på skotørkeren eller i tørkeskapet. Legg de våte klærne i en pose merket med barnets navn på plassen.\n\n" +
      "Dette fikser du lett – pust med magen!"
    );
  }

  // Scenario 2: Konflikt / slåing / biting / sparking / dytte
  if (
    q.includes('slå') || 
    q.includes('bit') || 
    q.includes('dytt') || 
    q.includes('lugge') || 
    q.includes('klyp') || 
    q.includes('konflikt') || 
    q.includes('krangl') || 
    q.includes('sint')
  ) {
    return (
      "1. **Stopp situasjonen fysisk og rolig:** Gå rolig imellom barna med én gang. Sett deg på huk i øyehøyde og hold en hånd varsomt imellom dem for å hindre flere slag/bitt.\n\n" +
      "2. **Trøst den som ble skadet først:** Vend oppmerksomheten til barnet som fikk vondt. Si: «Oi, det der gjorde vondt! Kom hit til meg, jeg passer på deg.» Sjekk for synlige merker eller hevelser.\n\n" +
      "3. **Sett tydelig grense uten kjefting:** Se rolig på barnet som slo/bet og si bestemt: «Stopp. Jeg lar deg ikke slå/bite. Hendene våre er til å bygge og leke med.» Skjerm situasjonen så begge roer seg.\n\n" +
      "4. **Informer fast ansatt:** Gi beskjed til pedagogisk leder eller fast ansatt på avdelingen. De skal kjenne til hendelsen og vurdere om det må nevnes til foreldrene ved henting."
    );
  }

  // Scenario 3: Gråt ved levering / savner foreldre / utrygghet
  if (
    q.includes('gråt') || 
    q.includes('gråter') || 
    q.includes('mamma') || 
    q.includes('pappa') || 
    q.includes('savn') || 
    q.includes('levert') || 
    q.includes('levering') || 
    q.includes('lei seg')
  ) {
    return (
      "1. **Gå ned i øyehøyde og tilby et trygt fang:** Sett deg på gulvet eller en lav krakk. Strekk ut armene og si: «Hei! Er det litt vanskelig å si ha det i dag? Kom og sitt litt hos meg.»\n\n" +
      "2. **Anerkjenn følelsen konkret:** Si til barnet: «Jeg skjønner godt at du savner mamma/pappa. De er på jobb, og de kommer tilbake og henter deg etter frukten. Nå skal vi passe på hverandre her.»\n\n" +
      "3. **Avled med en konkret sanselig aktivitet:** Bli med til vinduet for å vinke, se på fuglene i treet, eller finn frem en spennende lek (f.eks. dyrene i kassen eller en bok med lyder).\n\n" +
      "4. **Spør kollega:** Hvis gråten ikke slipper etter 10 minutter, spør fast ansatt: «Hva pleier å være favorittleken til [navn] når savnet er stort?»"
    );
  }

  // Scenario 4: Kaos / urolig gruppe / dødtid før mat eller samling
  if (
    q.includes('kaos') || 
    q.includes('dødtid') || 
    q.includes('urolig') || 
    q.includes('kjeder') || 
    q.includes('aktivitet') || 
    q.includes('lek') || 
    q.includes('samling')
  ) {
    return (
      "1. **Sett deg ned på gulvet:** Barn trekkes automatisk mot voksne som setter seg ned. Trekk ut en kasse med Duplo, togskinner eller biler.\n\n" +
      "2. **Start en samlende sang eller bevegelseslek:** Begynn å synge med rolig eller engasjert stemme:\n" +
      "   - «Hode, skulder, kne og tå» (start sakte, øk tempoet!)\n" +
      "   - «Bjørnen sover» (legg deg under et teppe i midten)\n" +
      "   - «Hjulene på bussen» (bruk store armbevegelser)\n\n" +
      "3. **Avklar med fast ansatt:** Gå bort og spør: «Hva er neste post på programmet, og hvor ønsker dere at jeg plasserer meg akkurat nå?»"
    );
  }

  // Scenario 5: Påkledning i garderoben
  if (
    q.includes('garderobe') || 
    q.includes('påkledning') || 
    q.includes('kle på') || 
    q.includes('votter') || 
    q.includes('glidelås')
  ) {
    return (
      "1. **Porsjoner barna:** Ta aldri mer enn 2-3 barn i gangen. Sitt på gulvet eller en lav krakk.\n\n" +
      "2. **Fast påkledningsrekkefølge:**\n" +
      "   1. Do/bleiesjekk først.\n" +
      "   2. Ull/mellomlag.\n" +
      "   3. Hals og lue.\n" +
      "   4. Dress.\n" +
      "   5. Støvler og votter til slutt.\n\n" +
      "3. **Mestringsscript:** Si: «Prøv å tråkke beinet inn i dressen selv først, så hjelper jeg deg med glidelåsen!» Barn elsker å få til ting selv."
    );
  }

  // Scenario 6: Soving / sovevakt
  if (q.includes('sov') || q.includes('vogn') || q.includes('sovevakt')) {
    return (
      "1. **Sjekk seler i vognen:** Barnet skal ALLTID ha på fempunktssele i vogna.\n\n" +
      "2. **Tilsyn hvert 10. minutt:** Gå bort til hver vogn jevnlig. Kjenn i nakken (skal være lunken, ikke klam eller kald) og se at brystkassen hever seg.\n\n" +
      "3. **Hvis et barn våkner og gråter:** Vugg vognen mykt og si med rolig stemme: «Nå er jeg her, sov litt til.» Hvis barnet er helt våkent, ta det opp og gå inn til de andre."
    );
  }

  // Standard praktisk smørbrødliste for tilkallingsvikar
  return (
    "1. **Skaff oversikt:** Sjekk hvor barna er og forsikre deg om at porten og ytterdørene er lukket.\n\n" +
    "2. **Spør fast ansatt (Det er forventet!):** Si til pedleder eller fagarbeider: «Hva ønsker dere at jeg bidrar med akkurat nå?»\n\n" +
    "3. **Vær tilstede i øyehøyde:** Sett deg ned på gulvet eller i sandkassa sammen med barna. Barn blir trygge når den voksne er fysisk tilgjengelig og rolig."
  );
}

export default function VikarAINodhjelp() {
  const [meldinger, setMeldinger] = useState([
    {
      id: 1,
      rolle: 'ki',
      tekst: 'Hei Vikar! Velkommen til barnehagen. Jeg er din digitale makker. Er det noe du lurer på om rutiner, sikkerhet, eller trenger du hjelp til å håndtere en situasjon akkurat nå? Spør meg!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const meldingerSluttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    meldingerSluttRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meldinger]);

  const handleSend = async (tekstSomSkalSendes?: string) => {
    const tekst = (tekstSomSkalSendes || input).trim();
    if (!tekst) return;

    setMeldinger(prev => [...prev, { id: Date.now(), rolle: 'vikar', tekst }]);
    setInput('');
    setIsTyping(true);

    try {
      // 1. Forsøk å kalle Gemini API via proxyen med den strenge vikar-systemprompten
      const response = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: `Vikarens situasjon/spørsmål akkurat nå: "${tekst}"`,
        config: {
          systemInstruction: vikarSystemPrompt
        }
      });

      if (response?.text && response.text.trim()) {
        setMeldinger(prev => [
          ...prev, 
          { id: Date.now() + 1, rolle: 'ki', tekst: response.text.trim() }
        ]);
        return;
      }
      throw new Error("Mottok tomt svar fra KI");
    } catch (err: any) {
      console.warn("Gemini API utilgjengelig eller kredittgrense nådd, bruker lokal praktisk veiledningsmotor:", err);
      
      // 2. Intelligent, praktisk fallback: Gir ALLTID den konkrete 1-2-3 listen i stedet for floskler
      const praktiskSvar = getVikarPraktiskNodhjelp(tekst);
      
      setMeldinger(prev => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          rolle: 'ki', 
          tekst: praktiskSvar
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickScenarios = [
    { label: 'Tiss i støvler/dress', text: 'Ett av barna har tisset seg ut i dressen, og støvlene er også fulle av tiss. Hva gjør jeg?' },
    { label: 'Slåing eller biting', text: 'To barn slåss om en spade i sandkassen, og det ene barnet slo det andre. Hva gjør jeg?' },
    { label: 'Utrøstelig gråt', text: 'Et barn gråter og savner mamma etter levering og vil ikke leke. Hva gjør jeg?' },
    { label: 'Kaos i garderoben', text: 'Det er fullt kaos under påkledning i garderoben og barna løper rundt. Hva gjør jeg?' }
  ];

  return (
    <div className="w-full h-full flex flex-col font-sans bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* HEADER FOR VIKAR */}
      <div className="bg-teal-700 text-white p-4 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2.5 rounded-xl shadow-inner text-amber-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-tight">Vikar-AI Nødhjelp</h1>
              <span className="text-[10px] bg-teal-800 text-teal-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                1-2-3 Handlingsveileder
              </span>
            </div>
            <p className="text-teal-100 text-xs mt-0.5">Praktiske, fysiske steg uten pedagogisk svada</p>
          </div>
        </div>
      </div>

      {/* SIKKERHETS-BANNER */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 leading-tight">
          <strong>Gylden sikkerhetsregel:</strong> Gi alltid beskjed til en fast ansatt før du forlater barnegruppa med et barn (f.eks. for skift på badet).
        </p>
      </div>

      {/* HURTIG-KNAPPER */}
      <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Hurtighjelp:</span>
        {quickScenarios.map((sc, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sc.text)}
            className="text-xs whitespace-nowrap bg-white hover:bg-teal-50 hover:text-teal-800 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-medium transition cursor-pointer"
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* CHAT-OMRÅDE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[380px] max-h-[550px]">
        {meldinger.map((msg: any) => (
          <div key={msg.id} className={`flex w-full ${msg.rolle === 'vikar' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[88%] sm:max-w-[80%] ${msg.rolle === 'vikar' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.rolle === 'vikar' ? 'bg-teal-700 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {msg.rolle === 'vikar' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              </div>

              <div className={`p-4 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                msg.rolle === 'vikar' 
                  ? 'bg-teal-700 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-sans'
              }`}>
                {msg.tekst}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start w-full">
            <div className="flex gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-600 text-white shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-xs flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Finner handlingssteg...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={meldingerSluttRef} />
      </div>

      {/* INPUT-OMRÅDE */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex gap-2">
          <input 
            type="text"
            placeholder="Beskriv situasjonen (f.eks. barn som slår, tiss i dressen, gråt)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 outline-none text-xs sm:text-sm bg-slate-50 text-slate-900"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={`px-5 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
              input.trim() && !isTyping
                ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
