import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  FileText,
  MessageSquare,
  Check,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AvvikItem {
  id: number | string;
  tittel: string;
  beskrivelse: string;
  base: string;
  meldtAv: string;
  dato: string;
  status: 'Åpen' | 'Under utbedring' | 'Lukket';
  alvorlighetsgrad: 'Høy' | 'Middels' | 'Lav';
  checklistId?: string;
  kommentarer?: string[];
}

interface HMSAvvikProps {
  onNavigate?: (tab: string) => void;
}

const HMSAvvik: React.FC<HMSAvvikProps> = ({ onNavigate }) => {
  // STATE: Liste over avvik
  const [avvik, setAvvik] = useState<AvvikItem[]>(() => {
    const saved = localStorage.getItem('styrern_hms_avvik_list');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'avvik_01', 
        tittel: 'Akebrett sperret rømningstrapp', 
        beskrivelse: 'To akebrett sperret rømningstrapp ved småbarnsgarderoben på Trollstua.',
        base: 'Trollstua', 
        meldtAv: 'Ingrid Solheim',
        dato: '04. okt 2026', 
        status: 'Under utbedring', 
        alvorlighetsgrad: 'Høy',
        checklistId: 'ark-3',
        kommentarer: ['Ryddet bort umiddelbart. Informasjon sendt på avdelingsmøte om at rømningsveier alltid skal holdes helt frie.']
      },
      { 
        id: 1, 
        tittel: 'Dør klemmer på småbarnsavdeling', 
        beskrivelse: 'Ytterdøren på Trollstua lukker seg for fort. Fare for klemskade.',
        base: 'Trollstua', 
        meldtAv: 'Ingrid Solheim',
        dato: '05. okt 2026', 
        status: 'Åpen', 
        alvorlighetsgrad: 'Høy',
        kommentarer: ['Vaktmester er varslet om stramming av dørpumpe.']
      },
      { 
        id: 2, 
        tittel: 'Brannøvelse mangler for høsten', 
        beskrivelse: 'Vi har ikke gjennomført den lovpålagte brannøvelsen for 2. halvår enda.',
        base: 'Hele barnehagen', 
        meldtAv: 'Systemet',
        dato: '01. okt 2026', 
        status: 'Under utbedring', 
        alvorlighetsgrad: 'Middels',
        kommentarer: ['Dato satt til 28. oktober. Evakueringskart oppdatert.']
      },
      { 
        id: 3, 
        tittel: 'Knust vindu i lekeskur', 
        beskrivelse: 'Et vindu i lekeskuret ute knuste i helgen. Glasskår er fjernet, men vinduet må byttes.',
        base: 'Uteområdet', 
        meldtAv: 'Vaktmester',
        dato: '28. sep 2026', 
        status: 'Lukket', 
        alvorlighetsgrad: 'Høy',
        kommentarer: ['Nytt pleksiglass montert 29. september. Saken er lukket.']
      }
    ];
  });

  // STATE: Filtrering
  const [filter, setFilter] = useState('Alle');
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    localStorage.setItem('styrern_hms_avvik_list', JSON.stringify(avvik));
  }, [avvik]);

  // FUNKSJON: Oppdater status på et avvik
  const oppdaterStatus = (id: number | string, nyStatus: 'Åpen' | 'Under utbedring' | 'Lukket') => {
    setAvvik(avvik.map(item => 
      item.id === id ? { ...item, status: nyStatus } : item
    ));
  };

  const handleLeggTilAvvik = () => {
    const tittel = prompt('Hva er avviket / hendelsen?');
    if (!tittel) return;
    const beskrivelse = prompt('Beskrivelse av situasjonen og faremoment:') || 'Meldt av styrer.';
    const base = prompt('Hvilken avdeling / sted (Trollstua / Multemyra / Klatremus / Bjørnehiet / Uteområdet):') || 'Uteområdet';
    const alvorlighetsgrad = (prompt('Alvorlighetsgrad (Høy / Middels / Lav):') || 'Middels') as any;

    const nySak: AvvikItem = {
      id: Date.now(),
      tittel,
      beskrivelse,
      base,
      meldtAv: 'Karoline Haug (Styrer)',
      dato: 'I dag',
      status: 'Åpen',
      alvorlighetsgrad: alvorlighetsgrad === 'Høy' ? 'Høy' : alvorlighetsgrad === 'Lav' ? 'Lav' : 'Middels',
      kommentarer: []
    };

    setAvvik([nySak, ...avvik]);
  };

  const handleLeggTilKommentar = (id: number | string) => {
    const kommentar = prompt('Skriv inn oppfølgingsnotat / tiltak:');
    if (!kommentar) return;

    setAvvik(avvik.map(item => {
      if (item.id === id) {
        return {
          ...item,
          kommentarer: [...(item.kommentarer || []), kommentar]
        };
      }
      return item;
    }));
  };

  const handleLastNedRapport = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 15);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text('HMS- OG AVVIKSRAPPORT FOR INTERNKONTROLL & TILSYN', 15, 22);

      doc.setFontSize(7.5);
      doc.setTextColor(165, 180, 252);
      doc.text(`Generert: ${new Date().toLocaleDateString('no-NO')}  |  Ansvarlig styrer: Karoline Haug`, 15, 29);

      let y = 46;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text('SAMMENDRAG AV AVVIK & INTERNKONTROLL', 15, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Totalt antall avvik: ${avvik.length}   •   Åpne: ${avvik.filter(a => a.status === 'Åpen').length}   •   Under utbedring: ${avvik.filter(a => a.status === 'Under utbedring').length}   •   Lukket: ${avvik.filter(a => a.status === 'Lukket').length}`, 15, y);
      y += 12;

      avvik.forEach((a, i) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 24, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`${i + 1}. ${a.tittel}   [Status: ${a.status.toUpperCase()} - ${a.alvorlighetsgrad} risiko]`, 18, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Base: ${a.base}   |   Meldt: ${a.dato} av ${a.meldtAv}`, 18, y + 10.5);

        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(a.beskrivelse.slice(0, 95), 18, y + 16);

        if (a.kommentarer && a.kommentarer.length > 0) {
          doc.setTextColor(79, 70, 229);
          doc.text(`Tiltak/notat: ${a.kommentarer[0].slice(0, 90)}`, 18, y + 20.5);
        }

        y += 28;
      });

      // Bunntekst & Signatur
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`Bekreftet av styrer: Karoline Haug (Sign.)   •   Dato: ${new Date().toLocaleDateString('no-NO')}`, 15, y);

      const datoStr = new Date().toISOString().split('T')[0];
      doc.save(`HMS_Tilsynsrapport_Eventyrskogen_${datoStr}.pdf`);

      setReportGenerated(true);
      setTimeout(() => setReportGenerated(false), 3000);
    } catch (err) {
      console.error('Feil ved generering av PDF:', err);
    }
  };

  // Filtrerer listen basert på valgt filter i toppen
  const filtrerteAvvik = filter === 'Alle' ? avvik : avvik.filter(a => a.status === filter);

  // Hjelpefunksjon for å gi riktig farge til nedtrekksmenyen basert på status
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Åpen': return 'bg-rose-100 text-rose-700 border-rose-200 focus:ring-rose-500';
      case 'Under utbedring': return 'bg-amber-100 text-amber-700 border-amber-200 focus:ring-amber-500';
      case 'Lukket': return 'bg-emerald-100 text-emerald-700 border-emerald-200 focus:ring-emerald-500';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOPP-PANEL: Tittel og Handlingsknapper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <ShieldAlert className="text-indigo-600" size={28} />
            <span>Internkontroll & HMS</span>
          </h2>
          <p className="text-slate-600 mt-1">Håndtering av avvik, hendelser og lovpålagte rutiner.</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => onNavigate && onNavigate('delegerthms')}
            className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
            title="Gå til delegerte sjekklister og rutiner"
          >
            <span>Delegert HMS</span>
          </button>
          <button 
            onClick={() => onNavigate ? onNavigate('tilsyn') : handleLastNedRapport()}
            className="flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            title="Åpne full tilsynseksport"
          >
            <FileText size={18} />
            <span>Tilsynsrapport (PDF)</span>
          </button>
          <button 
            onClick={handleLeggTilAvvik}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-3.5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            <span>Registrer nytt avvik</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SØK */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg w-fit border border-slate-200">
        {['Alle', 'Åpen', 'Under utbedring', 'Lukket'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === f 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 3. AVVIKSLISTEN */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {filtrerteAvvik.map((item) => (
            <li key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                
                {/* Venstre side: Informasjon */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-bold text-slate-800">{item.tittel}</h3>
                    {item.alvorlighetsgrad === 'Høy' && item.status !== 'Lukket' && (
                      <span className="flex items-center space-x-1 bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <AlertTriangle size={12} />
                        <span>Kritisk</span>
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
                    {item.beskrivelse}
                  </p>

                  {/* Viste kommentarer hvis noen */}
                  {item.kommentarer && item.kommentarer.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5 text-xs">
                      <span className="font-semibold text-slate-700 block">Notater og tiltak:</span>
                      {item.kommentarer.map((kom, i) => (
                        <p key={i} className="text-slate-600 italic">• {kom}</p>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-2">
                    <span className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Clock size={14} />
                      <span>{item.dato}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                      <span className="text-slate-400">Base:</span>
                      <span className="text-slate-700">{item.base}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                      <span className="text-slate-400">Meldt av:</span>
                      <span className="text-slate-700">{item.meldtAv}</span>
                    </span>
                    <button 
                      onClick={() => handleLeggTilKommentar(item.id)}
                      className="flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-800 px-1 font-semibold"
                    >
                      <MessageSquare size={14} />
                      <span>Legg til kommentar</span>
                    </button>
                  </div>
                </div>

                {/* Høyre side: Interaktiv Status (Nedtrekksmeny) */}
                <div className="flex items-center xl:flex-col xl:items-end justify-between xl:justify-start gap-4 min-w-[200px]">
                  <div className="flex flex-col w-full">
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider xl:text-right">
                      Status for hendelse
                    </label>
                    <select
                      value={item.status}
                      onChange={(e) => oppdaterStatus(item.id, e.target.value as any)}
                      className={`appearance-none w-full xl:w-auto text-sm font-semibold border rounded-lg px-4 py-2.5 pr-10 outline-none cursor-pointer transition-all shadow-sm ${getStatusColor(item.status)}`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.2em'
                      }}
                    >
                      <option value="Åpen">Åpen</option>
                      <option value="Under utbedring">Under utbedring</option>
                      <option value="Lukket">Lukket</option>
                    </select>
                  </div>
                </div>
                
              </div>
            </li>
          ))}
        </ul>
        
        {/* Tom-tilstand hvis alt er filtrert bort */}
        {filtrerteAvvik.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 size={48} className="text-emerald-200 mb-4" />
            <p className="text-lg font-medium text-slate-600">Ingen avvik funnet her!</p>
            <p className="text-sm">Du har god kontroll på sikkerheten.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default HMSAvvik;
