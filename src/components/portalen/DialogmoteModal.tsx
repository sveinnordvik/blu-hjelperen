import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Users, 
  Sparkles, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  FileText, 
  Send, 
  ExternalLink, 
  X, 
  Building2, 
  Clock, 
  Check, 
  AlertCircle, 
  FileCheck2, 
  Stethoscope,
  Copy,
  Mail,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AppDatePicker, DateTimeCombinedPicker } from './AppDatePicker';

export interface DialogmoteData {
  moteType: 'dialogmote1' | 'dialogmote2';
  moteDato: string;
  moteTid: string;
  sted: string;
  deltakere: {
    arbeidsgiver: string;
    arbeidstaker: string;
    sykmelder: string;
    bedriftshelsetjeneste: string;
    tillitsvalgt: string;
    navVeileder?: string;
  };
  arbeidsevne: {
    kanUtfores: string;
    utfordringer: string;
  };
  tiltak: {
    ergonomi: string;
    arbeidstid: string;
    organisatorisk: string;
    navBistand: string;
  };
  opptrapping: {
    gradertDato: string;
    grad: string;
    milepaeler: string;
  };
  nesteMoteDato: string;
  status: 'Utkast' | 'Fullført' | 'Innsendt til NAV';
  innsendtTidspunkt?: string;
  kvitteringsNr?: string;
}

interface DialogmoteModalProps {
  ansattNavn: string;
  ansattRolle: string;
  ansattBase: string;
  ansattFodselsdato?: string;
  moteType?: 'dialogmote1' | 'dialogmote2';
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export const DialogmoteModal: React.FC<DialogmoteModalProps> = ({
  ansattNavn,
  ansattRolle,
  ansattBase,
  ansattFodselsdato = '03.09.1991',
  moteType = 'dialogmote1',
  onClose,
  onToast
}) => {
  const erMote2 = moteType === 'dialogmote2';

  const [formData, setFormData] = useState<DialogmoteData>(() => ({
    moteType,
    moteDato: erMote2 ? '15.03.2027' : '28.10.2026',
    moteTid: '12:30 - 13:30',
    sted: erMote2 ? 'NAV Arbeidslivssenter / Møterom 3 (Evt. Teams)' : 'Eventyrskogen Barnehage (Styrerkontoret)',
    deltakere: {
      arbeidsgiver: 'Karoline Haug (Styrer)',
      arbeidstaker: ansattNavn,
      sykmelder: 'Dr. Thomas Holm (Fastlege)',
      bedriftshelsetjeneste: 'Grønn BHT v/ Ergoterapeut Ingrid Lie',
      tillitsvalgt: 'Morten Hansen (Verneombud)',
      navVeileder: erMote2 ? 'Kari Solbakken (NAV-veileder)' : ''
    },
    arbeidsevne: {
      kanUtfores: erMote2 
        ? `Gjennomfører språkgrupper, måltidsstunder og administrativ planlegging på ${ansattBase}. Mestring ved avgrensede oppgaver.`
        : `Kan gjennomføre samlingsstund, måltidshåndtering, lese- og språkgrupper samt pedagogisk planlegging og dokumentasjon på ${ansattBase}.`,
      utfordringer: erMote2
        ? 'Vedvarende rygg-/leddplager ved gjentatte tunge løft i stellesituasjoner og langvarig stående arbeid på avdelingen.'
        : 'Tunge løft ved bleieskift/toalett, påkledning av dresser/sko i lav sittestilling i garderoben, samt langvarig utevakt på hardt underlag.'
    },
    tiltak: {
      ergonomi: 'Hev-/senkbart stellebord benyttes fast. Avlastning fra kollegaer ved samlet påkledning i garderoben.',
      arbeidstid: 'Faste midtvakter (08:30 – 15:30) for å unngå aleneansvar og stress ved åpning/stenging.',
      organisatorisk: '20% økt skjermet tid til didaktisk arbeid og observasjon på pauserommet i rolige omgivelser.',
      navBistand: erMote2
        ? 'Søke om tilretteleggingstilskudd, vurdere BHT-ergonomisk tilpasning og vurdere overgang til 50% gradert AAP dersom friskmelding tar lengre tid.'
        : 'Vurdere tilretteleggingstilskudd fra NAV Arbeidslivssenter samt ergonomisk arbeidsplassvurdering fra BHT.'
    },
    opptrapping: {
      gradertDato: erMote2 ? '01.04.2027' : '10.11.2026',
      grad: erMote2 ? '50% gradert friskmelding' : '40% gradert friskmelding',
      milepaeler: erMote2
        ? 'Mål om 60% innen 6 uker, forutsatt jevn belastning og tilrettelegging på basen.'
        : 'Oppstart 40% fra 10. nov (2 dager per uke). Evaluering etter 3 uker med sikte på opptrapping til 60%.'
    },
    nesteMoteDato: erMote2 ? '25.04.2027' : '18.11.2026',
    status: 'Utkast'
  }));

  const [aktivFane, setAktivFane] = useState<'mote' | 'arbeidsevne' | 'tiltak' | 'opptrapping' | 'forhandvisning'>('mote');
  const [isInnsenderTilNav, setIsInnsenderTilNav] = useState(false);
  const [visNavKvittering, setVisNavKvittering] = useState(false);

  // AI: Fyll inn standard NAV-forslag for barnehage
  const handleFyllNavForslag = () => {
    setFormData(prev => ({
      ...prev,
      arbeidsevne: {
        kanUtfores: `Gjennomføre pedagogiske aktiviteter, språkgrupper, måltidsstunder og administrativ planlegging på ${ansattBase}. God funksjon i rolige omgivelser.`,
        utfordringer: 'Belastende løft ved bleieskift, bøyd arbeidsstilling i garderoben og fysisk krevende uteaktivitet over lengre tid.'
      },
      tiltak: {
        ergonomi: 'Bruk av hev/senk stellebord, ergonomisk stol i garderoben og fritak fra tunge løft.',
        arbeidstid: 'Fast midtvakt (08:30 – 15:30) for å unngå aleneansvar i åpnings- og stengevakten.',
        organisatorisk: 'Tildelt ekstra tid til pedagogisk dokumentasjon og skjermet forberedelse.',
        navBistand: erMote2 
          ? 'Søknad om tilretteleggingstilskudd, vurdering av mentorordning og tilpasset arbeidsutprøving via NAV.'
          : 'Søke om tilretteleggingstilskudd via NAV for vikaravlastning i garderobesituasjonen.'
      },
      opptrapping: {
        gradertDato: erMote2 ? '01.04.2027' : '10.11.2026',
        grad: erMote2 ? '50% gradert friskmelding' : '40% gradert friskmelding',
        milepaeler: 'Arbeidstid fordelt på kortere dager. Ny evaluering om 3 uker sammen med sykmelder og leder.'
      }
    }));
    if (onToast) onToast('NAV-standard for barnehagetilpasninger ble lagt inn!');
  };

  // Generer offisielt NAV-godkjent referat som PDF
  const handleGenererPdf = () => {
    try {
      const doc = new jsPDF();
      
      // NAV-toppstripe
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`REFERAT FRA ${erMote2 ? 'DIALOGMØTE 2 (NAV)' : 'DIALOGMØTE 1 (ARBEIDSGIVER)'}`, 15, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(`Jfr. Folketrygdloven § 8-7 ${erMote2 ? 'b' : 'a'} & Arbeidsmiljøloven § 4-6 | Eventyrskogen Barnehage`, 15, 22);

      let y = 42;

      // Ansatt og Møtefakta
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Arbeidstaker: ${ansattNavn} (Født: ${ansattFodselsdato})`, 20, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Stilling: ${ansattRolle} (${ansattBase})`, 20, y + 14);
      doc.text(`Møtedato: ${formData.moteDato} kl. ${formData.moteTid}  |  Møtested: ${formData.sted}`, 20, y + 21);

      y += 32;

      // Deltakere
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('1. Møtedeltakere', 15, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`• Arbeidsgiver: ${formData.deltakere.arbeidsgiver}`, 20, y); y += 4.5;
      doc.text(`• Arbeidstaker: ${formData.deltakere.arbeidstaker}`, 20, y); y += 4.5;
      doc.text(`• Sykmelder/Fastlege: ${formData.deltakere.sykmelder}`, 20, y); y += 4.5;
      doc.text(`• Bedriftshelsetjeneste (BHT): ${formData.deltakere.bedriftshelsetjeneste}`, 20, y); y += 4.5;
      doc.text(`• Tillitsvalgt / Verneombud: ${formData.deltakere.tillitsvalgt}`, 20, y); y += 4.5;
      if (erMote2 && formData.deltakere.navVeileder) {
        doc.text(`• NAV-veileder: ${formData.deltakere.navVeileder}`, 20, y); y += 4.5;
      }

      y += 4;

      // 2. Vurdering av Arbeidsevne
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('2. Vurdering av arbeidsevne og oppgaver i barnehagen', 15, y);
      y += 6;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, y, 180, 24, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Hvilke oppgaver kan utføres?', 20, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const linjerKan = doc.splitTextToSize(formData.arbeidsevne.kanUtfores, 170);
      doc.text(linjerKan, 20, y + 10);

      y += 28;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, y, 180, 24, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Hvilke arbeidsoppgaver er utfordrende?', 20, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const linjerUtfordring = doc.splitTextToSize(formData.arbeidsevne.utfordringer, 170);
      doc.text(linjerUtfordring, 20, y + 10);

      y += 28;

      // 3. Konkrete Tiltak
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('3. Avtalte tilretteleggingstiltak på arbeidsplassen', 15, y);
      y += 6;

      const tiltakListe = [
        { tittel: 'Ergonomiske tilpasninger:', tekst: formData.tiltak.ergonomi },
        { tittel: 'Arbeidstidsjusteringer:', tekst: formData.tiltak.arbeidstid },
        { tittel: 'Organisatorisk tilrettelegging:', tekst: formData.tiltak.organisatorisk },
        { tittel: 'Bistand / Tiltak fra NAV & BHT:', tekst: formData.tiltak.navBistand }
      ];

      tiltakListe.forEach(t => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${t.tittel}`, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const txtLinjer = doc.splitTextToSize(t.tekst, 160);
        doc.text(txtLinjer, 25, y + 4.5);
        y += 10 + (txtLinjer.length > 1 ? 4 : 0);
      });

      y += 2;

      // 4. Opptrapping og Friskmelding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('4. Plan for opptrapping og neste evaluering', 15, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Opptrapping: ${formData.opptrapping.grad} fra ${formData.opptrapping.gradertDato}`, 20, y); y += 5;
      doc.text(`Milepæler: ${formData.opptrapping.milepaeler}`, 20, y); y += 5;
      doc.text(`Dato for neste oppfølgingsmøte / evaluering: ${formData.nesteMoteDato}`, 20, y);

      y += 12;

      // Signaturfelt
      doc.setDrawColor(203, 213, 225);
      doc.line(20, y + 10, 85, y + 10);
      doc.line(115, y + 10, 180, y + 10);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Styrer / Arbeidsgiver', 20, y + 14);
      doc.text('Arbeidstaker', 115, y + 14);

      doc.save(`NAV_Referat_${erMote2 ? 'Dialogmote2' : 'Dialogmote1'}_${ansattNavn.replace(/\s+/g, '_')}.pdf`);
      if (onToast) onToast('Offisielt NAV-referat lastet ned som PDF!');
    } catch (err) {
      console.error('Feil ved generering av PDF:', err);
    }
  };

  // Simuler direkte innsending til NAV via digitalt grensesnitt
  const handleSendTilNav = () => {
    setIsInnsenderTilNav(true);
    setTimeout(() => {
      setIsInnsenderTilNav(false);
      setFormData(prev => ({
        ...prev,
        status: 'Innsendt til NAV',
        innsendtTidspunkt: new Date().toLocaleString('no-NO'),
        kvitteringsNr: `NAV-${Math.floor(100000 + Math.random() * 900000)}`
      }));
      setVisNavKvittering(true);
      if (onToast) onToast('Referat oversendt direkte til NAV Altinn / Arbeidsgiverportal!');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-[#1e1b4b] text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-700/60 rounded-2xl border border-indigo-500/40">
              <Building2 size={26} className="text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">
                  {erMote2 ? 'Dialogmøte 2 (I regi av NAV)' : 'Dialogmøte 1 (Arbeidsgiver & Fastlege)'}
                </h3>
                <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full border border-indigo-400/30 font-semibold">
                  Standard NAV-skjema
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Gjelder {ansattNavn} ({ansattRolle}, {ansattBase}) • Født: {ansattFodselsdato}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenererPdf}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition border border-white/20 cursor-pointer"
              title="Last ned referat som PDF"
            >
              <Download size={14} />
              <span>Last ned PDF</span>
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* FANER */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex space-x-4 text-xs font-bold">
          <button
            onClick={() => setAktivFane('mote')}
            className={`py-3 border-b-2 transition cursor-pointer ${aktivFane === 'mote' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            1. Møteopplysninger & Deltakere
          </button>
          <button
            onClick={() => setAktivFane('arbeidsevne')}
            className={`py-3 border-b-2 transition cursor-pointer ${aktivFane === 'arbeidsevne' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            2. Vurdering av Arbeidsevne
          </button>
          <button
            onClick={() => setAktivFane('tiltak')}
            className={`py-3 border-b-2 transition cursor-pointer ${aktivFane === 'tiltak' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            3. Tilrettelegging & Tiltak
          </button>
          <button
            onClick={() => setAktivFane('opptrapping')}
            className={`py-3 border-b-2 transition cursor-pointer ${aktivFane === 'opptrapping' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            4. Opptrapping & Innsending
          </button>
        </div>

        {/* INNHOLD */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* AI FORSLAG BANNER */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles size={20} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-indigo-950 block">Automatisk forslag fra Styrer AI (NAV-standard)</span>
                <span className="text-[11px] text-indigo-800">
                  Fyller inn kvalitetssikrede formuleringer for barnehageansatte (løft, avlastning, skjermet tid).
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFyllNavForslag}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
            >
              Fyll inn forslag
            </button>
          </div>

          {/* FANE 1: MØTEOPPLYSNINGER */}
          {aktivFane === 'mote' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <DateTimeCombinedPicker 
                    label="Møtedato & Klokkeslett"
                    dateValue={formData.moteDato}
                    timeValue={formData.moteTid}
                    onDateChange={(d) => setFormData(prev => ({ ...prev, moteDato: d }))}
                    onTimeChange={(t) => setFormData(prev => ({ ...prev, moteTid: t }))}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Møtested</label>
                  <input 
                    type="text" 
                    value={formData.sted}
                    onChange={(e) => setFormData(prev => ({ ...prev, sted: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Deltakere på møtet:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Arbeidsgiver (Leder)</label>
                    <input 
                      type="text" 
                      value={formData.deltakere.arbeidsgiver}
                      onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, arbeidsgiver: e.target.value } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Arbeidstaker</label>
                    <input 
                      type="text" 
                      value={formData.deltakere.arbeidstaker}
                      onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, arbeidstaker: e.target.value } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Fastlege / Sykmelder</label>
                    <input 
                      type="text" 
                      value={formData.deltakere.sykmelder}
                      onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, sykmelder: e.target.value } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Bedriftshelsetjeneste (BHT)</label>
                    <input 
                      type="text" 
                      value={formData.deltakere.bedriftshelsetjeneste}
                      onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, bedriftshelsetjeneste: e.target.value } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Tillitsvalgt / Verneombud</label>
                    <input 
                      type="text" 
                      value={formData.deltakere.tillitsvalgt}
                      onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, tillitsvalgt: e.target.value } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  {erMote2 && (
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">NAV-veileder</label>
                      <input 
                        type="text" 
                        value={formData.deltakere.navVeileder || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, deltakere: { ...prev.deltakere, navVeileder: e.target.value } }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FANE 2: ARBEIDSEVNE */}
          {aktivFane === 'arbeidsevne' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Hvilke oppgaver i barnehagen kan arbeidstakeren utføre i dag?
                </label>
                <textarea 
                  value={formData.arbeidsevne.kanUtfores}
                  onChange={(e) => setFormData(prev => ({ ...prev, arbeidsevne: { ...prev.arbeidsevne, kanUtfores: e.target.value } }))}
                  rows={4}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Hvilke oppgaver og situasjoner skaper utfordringer eller smerter?
                </label>
                <textarea 
                  value={formData.arbeidsevne.utfordringer}
                  onChange={(e) => setFormData(prev => ({ ...prev, arbeidsevne: { ...prev.arbeidsevne, utfordringer: e.target.value } }))}
                  rows={4}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* FANE 3: TILTAK */}
          {aktivFane === 'tiltak' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ergonomiske tilpasninger
                  </label>
                  <textarea 
                    value={formData.tiltak.ergonomi}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiltak: { ...prev.tiltak, ergonomi: e.target.value } }))}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Arbeidstid & Vaktjustering
                  </label>
                  <textarea 
                    value={formData.tiltak.arbeidstid}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiltak: { ...prev.tiltak, arbeidstid: e.target.value } }))}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organisatoriske tiltak (Skjerming, oppgaver)
                  </label>
                  <textarea 
                    value={formData.tiltak.organisatorisk}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiltak: { ...prev.tiltak, organisatorisk: e.target.value } }))}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiltak / Bistand fra NAV og BHT
                  </label>
                  <textarea 
                    value={formData.tiltak.navBistand}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiltak: { ...prev.tiltak, navBistand: e.target.value } }))}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FANE 4: OPPTRAPPING & INNSENDING */}
          {aktivFane === 'opptrapping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <AppDatePicker 
                    label="Oppstart gradert dato"
                    value={formData.opptrapping.gradertDato}
                    onChange={(d) => setFormData(prev => ({ ...prev, opptrapping: { ...prev.opptrapping, gradertDato: d } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planlagt sykemeldingsgrad</label>
                  <input 
                    type="text" 
                    value={formData.opptrapping.grad}
                    onChange={(e) => setFormData(prev => ({ ...prev, opptrapping: { ...prev.opptrapping, grad: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <AppDatePicker 
                    label="Dato for neste møte"
                    value={formData.nesteMoteDato}
                    onChange={(d) => setFormData(prev => ({ ...prev, nesteMoteDato: d }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Milepæler og oppsummering</label>
                <textarea 
                  value={formData.opptrapping.milepaeler}
                  onChange={(e) => setFormData(prev => ({ ...prev, opptrapping: { ...prev.opptrapping, milepaeler: e.target.value } }))}
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {visNavKvittering && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-1 animate-in fade-in">
                  <div className="flex items-center space-x-2 font-bold text-xs text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Innsending bekreftet til NAV</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Kvitteringsnummer: <strong>{formData.kvitteringsNr}</strong> • Innsendt: {formData.innsendtTidspunkt}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGenererPdf}
            className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 text-xs font-bold transition cursor-pointer"
          >
            <Download size={16} />
            <span>Last ned referat-PDF</span>
          </button>

          <div className="flex space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Lukk
            </button>
            <button
              type="button"
              onClick={handleSendTilNav}
              disabled={isInnsenderTilNav}
              className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>{isInnsenderTilNav ? 'Overfører til NAV...' : 'Send referat direkte til NAV'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- EGEN KOMPONENT FOR INNKALLING TIL DIALOGMØTE 1 & 2 ---
interface DialogmoteInnkallingModalProps {
  ansattNavn: string;
  ansattRolle: string;
  ansattBase: string;
  moteType: 'dialogmote1' | 'dialogmote2';
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export const DialogmoteInnkallingModal: React.FC<DialogmoteInnkallingModalProps> = ({
  ansattNavn,
  ansattRolle,
  ansattBase,
  moteType,
  onClose,
  onToast
}) => {
  const erMote2 = moteType === 'dialogmote2';

  const [dato, setDato] = useState(erMote2 ? '15.03.2027' : '28.10.2026');
  const [tid, setTid] = useState('12:30 - 13:30');
  const [sted, setSted] = useState(erMote2 ? 'NAV Arbeidslivssenter / Møterom 3 (Evt. Teams)' : 'Eventyrskogen Barnehage (Styrerkontoret)');
  const [agenda, setAgenda] = useState(
    erMote2
      ? '1. Velkommen og status på fraværet (uke 26)\n2. Evaluering av tilrettelegging i barnehagen så langt\n3. Arbeidstakers og arbeidsgivers vurdering av restarbeidsevne\n4. Drøfting av tiltak og bistand fra NAV (tilretteleggingstilskudd, mentor, arbeidstrening)\n5. Oppdatert oppfølgingsplan og veien videre'
      : '1. Velkommen og hensikt med møtet\n2. Gjennomgang av dagens arbeidssituasjon og oppgaver i barnehagen\n3. Hvilke arbeidsoppgaver som kan utføres / utfordringer\n4. Konkrete tilretteleggingstiltak (ergonomi, arbeidstid, skjermet planleggingstid)\n5. Opptrappingsplan og evalueringstidspunkt'
  );
  const [kopiert, setKopiert] = useState(false);

  const fornavn = ansattNavn ? ansattNavn.split(' ')[0] : 'Ansatt';

  const innkallingsBrevTekst = `INNKALLING TIL ${erMote2 ? 'DIALOGMØTE 2 (I REGI AV NAV)' : 'DIALOGMØTE 1'}\nJfr. Folketrygdloven § 8-7 ${erMote2 ? 'b' : 'a'} og Arbeidsmiljøloven § 4-6\n\nTil: ${ansattNavn} (${ansattRolle})\nDato: ${dato}\nTidspunkt: ${tid}\nSted: ${sted}\n\nKjære ${fornavn},\n\nI henhold til gjeldende lovverk kalles det herved inn til dialogmøte vedrørende ditt sykefravær og tilrettelegging på arbeidsplassen.\n\nHensikten med møtet er å ha en trygg og konstruktiv samtale om din arbeidssituasjon, vurdere hvilke tilretteleggingstiltak som er mulige i barnehagen, og legge en god plan for opptrapping og tilbakeføring i eget tempo.\n\nAGENDA:\n${agenda}\n\nDELTAKERE:\n• Arbeidsgiver: Karoline Haug (Styrer)\n• Arbeidstaker: ${ansattNavn}\n• Sykmelder / Fastlege: Dr. Thomas Holm\n• Bedriftshelsetjeneste: Grønn BHT\n• Tillitsvalgt / Verneombud: Morten Hansen (hvis ønskelig)\n${erMote2 ? '• NAV-veileder: Møteleder fra NAV Arbeidslivssenter\n' : ''}\nDersom tidspunktet ikke passer, vennligst gi beskjed så snart som mulig slik at vi kan finne et alternativ.\n\nMed vennlig hilsen,\nKaroline Haug\nStyrer, Eventyrskogen Barnehage\nTlf: 900 12 345 | E-post: styrer@eventyrskogen.no`;

  const handleKopierTekst = () => {
    navigator.clipboard.writeText(innkallingsBrevTekst);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2500);
    if (onToast) onToast('Innkallingstekst kopiert til utklipp!');
  };

  const handleLastNedPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`INNKALLING TIL ${erMote2 ? 'DIALOGMØTE 2' : 'DIALOGMØTE 1'}`, 15, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text('Eventyrskogen Barnehage | Lovpålagt oppfølging jfr. Folketrygdloven § 8-7', 15, 22);

      let y = 44;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Mottaker: ${ansattNavn} (${ansattRolle}, ${ansattBase})`, 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Møtetidspunkt: ${dato} kl. ${tid}  |  Møtested: ${sted}`, 20, y + 15);

      y += 30;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const brevLinjer = [
        `Kjære ${fornavn},`,
        '',
        `I henhold til gjeldende lovverk kalles det herved inn til ${erMote2 ? 'Dialogmøte 2 i regi av NAV' : 'Dialogmøte 1'} vedrørende ditt sykefravær og videre tilrettelegging på arbeidsplassen.`,
        '',
        'Hensikten med møtet er å ha en trygg og konstruktiv samtale om din arbeidssituasjon, vurdere hvilke tilretteleggingstiltak som er mulige i barnehagen, og legge en god plan for opptrapping og tilbakeføring i eget tempo.',
        '',
        'MØTEAGENDA:'
      ];

      brevLinjer.forEach(l => {
        const wrapped = doc.splitTextToSize(l, 175);
        doc.text(wrapped, 18, y);
        y += (wrapped.length * 5) + 1;
      });

      const agendaLinjer = doc.splitTextToSize(agenda, 170);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, y, 175, (agendaLinjer.length * 5) + 6, 2, 2, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(agendaLinjer, 22, y + 5);
      y += (agendaLinjer.length * 5) + 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Dersom tidspunktet ikke passer, vennligst ta kontakt så snart som mulig slik at vi finner et nytt tidspunkt.', 18, y);
      y += 16;

      doc.setFont('helvetica', 'bold');
      doc.text('Med vennlig hilsen,', 18, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Karoline Haug', 18, y); y += 4.5;
      doc.setTextColor(100, 116, 139);
      doc.text('Styrer, Eventyrskogen Barnehage', 18, y);

      doc.save(`Innkalling_${erMote2 ? 'Dialogmote2' : 'Dialogmote1'}_${ansattNavn.replace(/\s+/g, '_')}.pdf`);
      if (onToast) onToast('Innkallingsbrev lastet ned som PDF!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-[#1e1b4b] text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-700/60 rounded-2xl border border-indigo-500/40">
              <Mail size={24} className="text-indigo-200" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                Innkalling til {erMote2 ? 'Dialogmøte 2 (NAV)' : 'Dialogmøte 1'}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Ferdig juridisk mal til arbeidstaker, lege og bedriftshelsetjeneste
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <X size={22} />
          </button>
        </div>

        {/* INNHOLD */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <DateTimeCombinedPicker 
                label="Møtedato & Tidspunkt"
                dateValue={dato}
                timeValue={tid}
                onDateChange={setDato}
                onTimeChange={setTid}
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Møtested</label>
              <input 
                type="text" 
                value={sted} 
                onChange={(e) => setSted(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Agenda for møtet (kan redigeres):</label>
            <textarea 
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={4}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* FORHÅNDSVISNING AV INNKALLINGSTEKST */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Forhåndsvisning av innkallingstekst:</span>
            <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200 max-h-52 overflow-y-auto">
              {innkallingsBrevTekst}
            </pre>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLastNedPdf}
            className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 text-xs font-bold transition cursor-pointer"
          >
            <Download size={16} />
            <span>Last ned innkallingsbrev (PDF)</span>
          </button>

          <div className="flex space-x-2.5">
            <button
              type="button"
              onClick={handleKopierTekst}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {kopiert ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{kopiert ? 'Kopiert til utklipp!' : 'Kopier innkalling'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onToast) onToast(`Innkalling til ${fornavn} er sendt på e-post og registrert i tidslinjen.`);
                onClose();
              }}
              className="flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Send size={14} />
              <span>Send innkalling til deltakere</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
