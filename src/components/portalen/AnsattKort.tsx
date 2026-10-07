import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  FileText, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Save,
  Download,
  AlertCircle,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export interface AnsattKravData {
  navn: string;
  rolle: string;
  base: string;
  ansattDato: string;
  fodselsdato?: string;
  politiattest: { godkjent: boolean; datoFremvist: string };
  arbeidskontrakt: { godkjent: boolean; info: string };
  taushetserklaring: { godkjent: boolean; info: string };
  hmsGjennomgang: { godkjent: boolean; info: string };
}

interface AnsattKortProps {
  initialAnsatt?: AnsattKravData;
  onClose?: () => void;
  onSaved?: (ansatt: AnsattKravData) => void;
}

const AnsattKort: React.FC<AnsattKortProps> = ({ 
  initialAnsatt, 
  onClose,
  onSaved 
}) => {
  // MOCK-DATA: Den ansatte som styreren har klikket inn på
  const [ansatt, setAnsatt] = useState<AnsattKravData>(initialAnsatt || {
    navn: 'Lars Pettersen',
    rolle: 'Vikar',
    base: 'Flytende',
    ansattDato: '01. okt 2026',
    
    // De "Nådeløse" Kravene
    politiattest: { godkjent: false, datoFremvist: '' },
    arbeidskontrakt: { godkjent: true, info: 'Signert elektronisk 28. sep 2026' },
    taushetserklaring: { godkjent: true, info: 'Signert 28. sep 2026' },
    hmsGjennomgang: { godkjent: false, info: 'Mangler gjennomgang av branninstruks' }
  });

  const [lagretMelding, setLagretMelding] = useState(false);

  // Toggle-funksjoner for å endre status (simulerer styrerens avkrysning)
  const togglePolitiattest = () => {
    setAnsatt(prev => ({
      ...prev, 
      politiattest: { 
        godkjent: !prev.politiattest.godkjent, 
        datoFremvist: !prev.politiattest.godkjent ? new Date().toLocaleDateString('no-NO') : '' 
      }
    }));
  };

  const toggleKrav = (felt: 'arbeidskontrakt' | 'taushetserklaring' | 'hmsGjennomgang') => {
    setAnsatt(prev => ({
      ...prev,
      [felt]: { ...prev[felt], godkjent: !prev[felt].godkjent }
    }));
  };

  // Sjekker om alle kritiske krav er oppfylt
  const erKlarForVakt = ansatt.politiattest.godkjent && ansatt.arbeidskontrakt.godkjent && ansatt.taushetserklaring.godkjent;

  const handleLagre = () => {
    localStorage.setItem(`styrern_ansatt_${ansatt.navn.replace(/\s+/g, '_')}`, JSON.stringify(ansatt));
    if (onSaved) onSaved(ansatt);
    setLagretMelding(true);
    setTimeout(() => {
      setLagretMelding(false);
      if (onClose) onClose();
    }, 1500);
  };

  // Eksporterer ansattmappe som PDF for tilsyn
  const handleEksporterPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 16);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text('ANSATT-DOKUMENTASJON & COMPLIANCE (TILSYNSMODUS)', 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text(`Utskriftsdato: ${new Date().toLocaleDateString('no-NO')}  |  Saksbehandler: Karoline Haug`, 15, 31);

      let y = 48;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(ansatt.navn, 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Stilling: ${ansatt.rolle}  |  Base: ${ansatt.base}  |  Ansatt fra: ${ansatt.ansattDato}`, 20, y + 15);
      doc.text(`Status for vakttilgang: ${erKlarForVakt ? 'KLAR FOR VAKT (Lovkrav oppfylt)' : 'IKKE KLAR (Mangler dokumentasjon)'}`, 20, y + 20);

      y += 32;

      const kravListe = [
        {
          tittel: '1. Politiattest (§ 30 Barnehageloven)',
          status: ansatt.politiattest.godkjent ? 'GODKJENT' : 'MANGLER',
          detalj: ansatt.politiattest.godkjent 
            ? `Fremvist og registrert av styrer: ${ansatt.politiattest.datoFremvist}`
            : 'Mangler gyldig attest. Den ansatte kan IKKE arbeide alene med barn.'
        },
        {
          tittel: '2. Arbeidskontrakt',
          status: ansatt.arbeidskontrakt.godkjent ? 'GODKJENT' : 'MANGLER',
          detalj: ansatt.arbeidskontrakt.info
        },
        {
          tittel: '3. Taushetserklæring (§ 13 Forvaltningsloven & Barnehageloven)',
          status: ansatt.taushetserklaring.godkjent ? 'GODKJENT' : 'MANGLER',
          detalj: ansatt.taushetserklaring.info
        },
        {
          tittel: '4. HMS & Beredskapsgjennomgang',
          status: ansatt.hmsGjennomgang.godkjent ? 'GODKJENT' : 'UNDER UTREDNING',
          detalj: ansatt.hmsGjennomgang.info
        }
      ];

      kravListe.forEach((krav) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 20, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(krav.tittel, 18, y + 6);

        if (krav.status === 'GODKJENT') {
          doc.setTextColor(5, 150, 105);
        } else {
          doc.setTextColor(225, 29, 72);
        }
        doc.text(`[${krav.status}]`, 160, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(krav.detalj, 18, y + 13);

        y += 24;
      });

      // Signaturbekreftelse
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`Bekreftet av styrer Karoline Haug  |  Eventyrskogen Barnehage  |  Dato: ${new Date().toLocaleDateString('no-NO')}`, 15, y);

      doc.save(`Ansattmappe_${ansatt.navn.replace(/\s+/g, '_')}_Tilsyn.pdf`);
    } catch (err) {
      console.error('Feil ved generering av ansattmappe-PDF:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col relative">
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full transition cursor-pointer"
          title="Lukk"
        >
          <X size={18} />
        </button>
      )}

      {/* 1. HEADER: Personalia & Overordnet status */}
      <div className={`p-6 border-b flex items-start justify-between transition-colors ${erKlarForVakt ? 'bg-indigo-900 border-indigo-800 text-white' : 'bg-rose-900 border-rose-800 text-white'}`}>
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full shadow-inner ${erKlarForVakt ? 'bg-indigo-800' : 'bg-rose-800'}`}>
            <User size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{ansatt.navn}</h2>
            <div className="flex items-center space-x-3 text-sm mt-1 opacity-90">
              <span className="bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider text-[11px] font-bold">
                {ansatt.rolle}
              </span>
              <span>•</span>
              <span>{ansatt.base}</span>
              {ansatt.fodselsdato && (
                <>
                  <span>•</span>
                  <span>Født: {ansatt.fodselsdato}</span>
                </>
              )}
              <span>•</span>
              <span>Startet: {ansatt.ansattDato}</span>
            </div>
          </div>
        </div>
        
        {/* Stor status-indikator */}
        <div className="flex flex-col items-end mr-6 sm:mr-0">
          {erKlarForVakt ? (
            <div className="flex items-center space-x-2 bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Klar for vakt</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-rose-500/30 text-rose-100 border border-rose-500/40 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm">
              <AlertTriangle size={18} />
              <span>Mangler dokumentasjon</span>
            </div>
          )}
        </div>
      </div>

      {lagretMelding && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 p-3 text-center text-sm font-semibold flex items-center justify-center space-x-2 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>Endringer for {ansatt.navn} er lagret!</span>
        </div>
      )}

      <div className="p-6 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
          De "Nådeløse" Kravene (Compliance)
        </h3>
        
        <div className="space-y-4">
          
          {/* KRAV 1: Politiattest */}
          <div className={`p-4 rounded-xl border-2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${ansatt.politiattest.godkjent ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-start space-x-3">
              <ShieldCheck size={24} className={ansatt.politiattest.godkjent ? 'text-emerald-500' : 'text-rose-500'} />
              <div>
                <h4 className={`font-bold ${ansatt.politiattest.godkjent ? 'text-slate-800' : 'text-rose-800'}`}>Politiattest (Barnehageloven § 30)</h4>
                <p className="text-sm text-slate-500 mt-0.5">Må være fremvist før første vakt. Plettfri vandel kreves.</p>
                
                {/* Dynamisk datofelt for fremvisning */}
                {ansatt.politiattest.godkjent && (
                  <div className="flex items-center space-x-2 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-100">
                    <Calendar size={12} />
                    <span>Fremvist og godkjent av Styrer: {ansatt.politiattest.datoFremvist}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={togglePolitiattest}
              className={`shrink-0 flex items-center space-x-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-colors border cursor-pointer ${ansatt.politiattest.godkjent ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm'}`}
            >
              {ansatt.politiattest.godkjent ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{ansatt.politiattest.godkjent ? 'Godkjent' : 'Merk som fremvist'}</span>
            </button>
          </div>

          {/* KRAV 2: Arbeidskontrakt */}
          <div className={`p-4 rounded-xl border-2 transition-colors flex items-center justify-between gap-4 ${ansatt.arbeidskontrakt.godkjent ? 'bg-white border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start space-x-3">
              <FileText size={24} className={ansatt.arbeidskontrakt.godkjent ? 'text-emerald-500' : 'text-amber-500'} />
              <div>
                <h4 className="font-bold text-slate-800">Arbeidskontrakt</h4>
                <p className="text-sm text-slate-500 mt-0.5">{ansatt.arbeidskontrakt.info}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleKrav('arbeidskontrakt')} 
              className="text-slate-400 hover:text-indigo-600 cursor-pointer p-1"
              title="Klikk for å endre status"
            >
              {ansatt.arbeidskontrakt.godkjent ? <CheckCircle2 size={24} className="text-emerald-500" /> : <XCircle size={24} className="text-rose-500" />}
            </button>
          </div>

          {/* KRAV 3: Taushetserklæring */}
          <div className={`p-4 rounded-xl border-2 transition-colors flex items-center justify-between gap-4 ${ansatt.taushetserklaring.godkjent ? 'bg-white border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start space-x-3">
              <Lock size={24} className={ansatt.taushetserklaring.godkjent ? 'text-emerald-500' : 'text-amber-500'} />
              <div>
                <h4 className="font-bold text-slate-800">Taushetserklæring (Barnehageloven)</h4>
                <p className="text-sm text-slate-500 mt-0.5">{ansatt.taushetserklaring.info}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleKrav('taushetserklaring')} 
              className="text-slate-400 hover:text-indigo-600 cursor-pointer p-1"
              title="Klikk for å endre status"
            >
              {ansatt.taushetserklaring.godkjent ? <CheckCircle2 size={24} className="text-emerald-500" /> : <XCircle size={24} className="text-rose-500" />}
            </button>
          </div>

          {/* KRAV 4: HMS / Beredskap */}
          <div className={`p-4 rounded-xl border-2 transition-colors flex items-center justify-between gap-4 ${ansatt.hmsGjennomgang.godkjent ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle size={24} className={ansatt.hmsGjennomgang.godkjent ? 'text-emerald-500' : 'text-rose-500'} />
              <div>
                <h4 className={`font-bold ${ansatt.hmsGjennomgang.godkjent ? 'text-slate-800' : 'text-rose-800'}`}>HMS & Beredskapsrutiner</h4>
                <p className="text-sm text-slate-500 mt-0.5">{ansatt.hmsGjennomgang.info}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleKrav('hmsGjennomgang')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border cursor-pointer transition ${ansatt.hmsGjennomgang.godkjent ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-rose-700 border-rose-300 shadow-sm hover:bg-rose-50'}`}
            >
              {ansatt.hmsGjennomgang.godkjent ? 'Gjennomgått' : 'Marker som gjennomgått'}
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER: Handlingsknapper */}
      <div className="p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <button 
          onClick={handleEksporterPdf}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors cursor-pointer"
        >
          <Download size={16} />
          <span>Eksportér ansattmappe (PDF)</span>
        </button>
        <button 
          onClick={handleLagre}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
        >
          <Save size={18} />
          <span>Lagre endringer</span>
        </button>
      </div>

    </div>
  );
};

export default AnsattKort;
