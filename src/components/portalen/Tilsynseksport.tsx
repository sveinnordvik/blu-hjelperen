import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  CheckSquare, 
  Square, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Printer,
  Eye,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface TilsynseksportProps {
  onNavigate?: (tab: string) => void;
}

const Tilsynseksport: React.FC<TilsynseksportProps> = () => {
  const [genererer, setGenererer] = useState(false);
  const [lastNedMelding, setLastNedMelding] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [valgt, setValgt] = useState({
    bemanningsnorm: true,
    hmsAvvik: true,
    pedagogiskPlan: false,
    personalLister: true
  });

  const byggPdfDokument = (): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const datoNorsk = new Date().toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let currentY = 15;

    // --- SIDE 1: HEADER & INTRO ---
    // Mørk marineblå header-banner
    doc.setFillColor(30, 27, 75); // #1e1b4b
    doc.rect(0, 0, 210, 40, 'F');

    // Tittel & Barnehagenavn
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 17);

    // Undertittel
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text('DOKUMENTASJON FOR KOMMUNALT TILSYN & ARBEIDSTILSYNET', 15, 25);

    // Metadata linje
    doc.setFontSize(8);
    doc.setTextColor(165, 180, 252); // indigo-300
    doc.text(`Org.nr: 987 654 321   |   Utskriftsdato: ${datoNorsk}   |   Ansvarlig: Styrer Karoline Haug`, 15, 33);

    currentY = 48;

    // Sammendrags-kort (KPI / Statusoppsummering)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, currentY, 180, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600

    // Kolonne 1
    doc.text('INNSKREVNE BARN', 20, currentY + 7);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('78 barn', 20, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Fordelt på 4 baser', 20, currentY + 19);

    // Kolonne 2
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PEDAGOGNORM (§ 25)', 65, currentY + 7);
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('100% Oppfylt', 65, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('6 av 6 ped.ledere', 65, currentY + 19);

    // Kolonne 3
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('BEMANNINGSNORM (§ 26)', 115, currentY + 7);
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('1 : 5.8', 115, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Lovkrav: 1 : 6.0', 115, currentY + 19);

    // Kolonne 4
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('HMS-STATUS', 160, currentY + 7);
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Godkjent', 160, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('0 åpne kritiske avvik', 160, currentY + 19);

    currentY += 32;

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > 275) {
        doc.addPage();
        currentY = 20;
      }
    };

    // --- SEKSJON 1: BEMANNINGS- OG PEDAGOGNORM ---
    if (valgt.bemanningsnorm) {
      checkPageBreak(50);
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.roundedRect(15, currentY, 180, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(49, 46, 129); // indigo-900
      doc.text('1. BEMANNINGSNORM OG PEDAGOGNORM (Barnehageloven §§ 25 og 26)', 18, currentY + 5.5);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const bemanningPunkter = [
        '• Lovpålagt pedagognorm (§ 25): Minst én pedagogisk leder per 7 barn under tre år, og per 14 barn over tre år.',
        '  Status: Eventyrskogen Barnehage har 6 godkjente barnehagelærere i faste stillinger. Ingen dispensasjoner.',
        '• Lovpålagt bemanningsnorm (§ 26): Minst én ansatt per 3 barn under 3 år, og per 6 barn over 3 år.',
        '  Status i kjernetid (09:30 - 14:30): Snitt 1 : 5.8 siste 12 mnd, som oppfyller lovens krav fullt ut.',
        '• Avdelinger & baser:',
        '   - Trollstua (0-3 år): 9 barn, 3 voksne (Ratio 1:3.0 - Oppfylt)',
        '   - Multemyra (0-3 år): 10 barn, 3 voksne (Ratio 1:3.3 - Forsterket med fast vikar)',
        '   - Klatremus (3-6 år): 17 barn, 3 voksne (Ratio 1:5.7 - Oppfylt)',
        '   - Bjørnehiet (3-6 år): 12 barn, 2 voksne (Ratio 1:6.0 - Oppfylt)',
        '• Vikarbruk og fraværsdekning: Ved akutt og planlagt fravær over 1 dag benyttes godkjente tilkallingsvikarer.'
      ];

      bemanningPunkter.forEach(p => {
        doc.text(p, 18, currentY);
        currentY += 5;
      });

      currentY += 4;
    }

    // --- SEKSJON 2: HMS & INTERNKONTROLL ---
    if (valgt.hmsAvvik) {
      checkPageBreak(50);
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(15, currentY, 180, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(49, 46, 129);
      doc.text('2. INTERNKONTROLL, HMS OG AVVIKSHÅNDTERING (Forskrift om miljørettet helsevern)', 18, currentY + 5.5);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const hmsPunkter = [
        '• Internkontrollsystemet revideres årlig i samråd med verneombud, tillitsvalgte og Samarbeidsutvalget (SU).',
        '• Årlig lekeplasskontroll: Gjennomført og godkjent av sertifisert kontrollør i mai 2026. Neste kontroll: Mai 2027.',
        '• Brannvern og evakuering: 1. halvårsøvelse gjennomført med godkjent rapport. Høstøvelse berammet til oktober 2026.',
        '• Mattilsyn / IK-Mat: Egenkontrollprogram etablert med daglig temperaturlogging av kjølerom og oppvask.',
        '• Avviksoversikt siste 12 mnd: Totalt 14 meldte avvik, hvorav 12 er lukket og 2 er under aktiv utbedring.',
        '   - Avvik 1: Klemsikring dør Trollstua (Åpen / Vaktmester bestilt)',
        '   - Avvik 2: Brannøvelse høst 2026 (Under utbedring / Gjennomføres 28. okt)',
        '   - Avvik 3: Utskifting vindu lekeskur (Lukket / Montert sikkerhetsglass)'
      ];

      hmsPunkter.forEach(p => {
        doc.text(p, 18, currentY);
        currentY += 5;
      });

      currentY += 4;
    }

    // --- SEKSJON 3: PERSONALOVERSIKT & POLITIATTESTER ---
    if (valgt.personalLister) {
      checkPageBreak(45);
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(15, currentY, 180, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(49, 46, 129);
      doc.text('3. PERSONALOVERSIKT OG POLITIATTESTATTESTERING (Barnehageloven § 30)', 18, currentY + 5.5);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const personalPunkter = [
        '• Krav om politiattest (§ 30): Samtlige ansatte, lærlinger og tilkallingsvikarer har fremvist godkjent, plettfri',
        '  politiattest før tiltredelse i stilling. Loggføres i personalsystemet med attestdato og saksnummer.',
        '• Stillingsfordeling og kompetanse (GDPR-tilpasset for tilsyn):',
        '   - 6 Pedagogiske ledere med godkjent barnehagelærerutdanning (100% stilling)',
        '   - 4 Fagarbeidere (Barne- og ungdomsarbeidere)',
        '   - 4 Barnehageassistenter',
        '   - 2 Faste godkjente tilkallingsvikarer med fullført opplæring',
        '• Sykefraværsoppfølging: Systematiske samtaler iht. Arbeidsmiljøloven § 4-6 ved 4 og 8 ukers fravær.'
      ];

      personalPunkter.forEach(p => {
        doc.text(p, 18, currentY);
        currentY += 5;
      });

      currentY += 4;
    }

    // --- SEKSJON 4: PEDAGOGISK ÅRSPLAN ---
    if (valgt.pedagogiskPlan) {
      checkPageBreak(40);
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(15, currentY, 180, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(49, 46, 129);
      doc.text('4. PEDAGOGISK ÅRSPLAN OG RAMMEPLANFORANKRING', 18, currentY + 5.5);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const planPunkter = [
        '• Årsplan forankret i Forskrift om rammeplan for barnehagens innhold og oppgaver.',
        '• Godkjent i Samarbeidsutvalget (SU) og gjort tilgjengelig for alle foresatte.',
        '• Dokumentert arbeid med de 7 fagområdene og overgangsrutiner til skole/SFO.',
        '• Skolestarterklubb ("Eventyrerne") gjennomføres ukentlig for de eldste barna.'
      ];

      planPunkter.forEach(p => {
        doc.text(p, 18, currentY);
        currentY += 5;
      });

      currentY += 4;
    }

    // --- BEKREFTELSE OG SIGNATURBLOKK ---
    checkPageBreak(40);
    currentY += 4;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, currentY, 180, 32, 1, 1, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('ERKLÆRING OG BEKREFTELSE FRA BARNEHAGENS LEDELSE', 20, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Undertegnede styrer bekrefter at opplysningene i denne rapporten er korrekte og hentet fra barnehagens styringssystem.',
      20,
      currentY + 13
    );
    doc.text(
      'Systemet overvåker lovpålagt bemannings- og pedagognorm kontinuerlig iht. Barnehageloven §§ 25, 26 og 30.',
      20,
      currentY + 17
    );

    // Signaturlinjer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Sted og dato: Oslo, ${datoNorsk}`, 20, currentY + 26);
    doc.text('Styrers signatur:  Karoline Haug (Sign.)', 105, currentY + 26);

    // Sidetall og bunntekst på alle sider
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Eventyrskogen Barnehage - Offisiell Tilsynsrapport  |  Generert via Styrer'n Barnehageportal`,
        15,
        290
      );
      doc.text(`Side ${i} av ${totalPages}`, 180, 290);
    }

    return doc;
  };

  const handleEksportPdf = () => {
    setGenererer(true);
    setLastNedMelding(null);

    setTimeout(() => {
      try {
        const doc = byggPdfDokument();
        const datoFil = new Date().toISOString().split('T')[0];
        const filnavn = `Tilsynsrapport_Eventyrskogen_${datoFil}.pdf`;

        // Laster ned PDF-filen direkte
        doc.save(filnavn);

        setGenererer(false);
        setLastNedMelding(`PDF-rapporten "${filnavn}" er ferdig generert og lagret!`);
        setTimeout(() => setLastNedMelding(null), 6000);
      } catch (err) {
        console.error('Kunne ikke generere PDF:', err);
        setGenererer(false);
      }
    }, 1000);
  };

  const handleForhandsvisPdf = () => {
    try {
      const doc = byggPdfDokument();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Kunne ikke forhåndsvise PDF:', err);
    }
  };

  const toggleValg = (key: keyof typeof valgt) => {
    setValgt({ ...valgt, [key]: !valgt[key] });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
      
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex bg-indigo-100 p-4 rounded-full text-indigo-700 mb-2 shadow-sm">
          <FileCheck size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Eksport for Tilsyn</h2>
        <p className="text-slate-600 max-w-lg mx-auto text-sm sm:text-base">
          Generer en komplett, formatert <strong>PDF-rapport</strong> klar for kommunalt tilsyn eller Arbeidstilsynet. Velg hva som skal inkluderes.
        </p>
      </div>

      {lastNedMelding && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{lastNedMelding}</div>
        </div>
      )}

      {/* Forhåndsvisnings-modal for PDF */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-[#1e1b4b] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText size={20} className="text-indigo-300" />
                <span className="font-bold text-sm sm:text-base">Forhåndsvisning: Offisiell Tilsynsrapport (PDF)</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEksportPdf}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition"
                >
                  <Download size={14} />
                  <span>Last ned PDF</span>
                </button>
                <button
                  onClick={() => setPdfPreviewUrl(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={pdfPreviewUrl}
                title="PDF Forhåndsvisning"
                className="w-full h-full rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-800">
            Innhold i tilsynsrapporten (PDF)
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            A4 Utskriftsformat
          </span>
        </div>
        
        <div className="space-y-4">
          {/* Valg 1 */}
          <div 
            onClick={() => toggleValg('bemanningsnorm')}
            className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${valgt.bemanningsnorm ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="mt-0.5 text-indigo-600">
              {valgt.bemanningsnorm ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-400" />}
            </div>
            <div>
              <p className="font-bold text-slate-800">Bemannings- og pedagognorm</p>
              <p className="text-sm text-slate-500 mt-1">Historisk data på bemanningstetthet, vikarbruk og dokumentasjon på oppfylt norm siste 12 mnd.</p>
            </div>
          </div>

          {/* Valg 2 */}
          <div 
            onClick={() => toggleValg('hmsAvvik')}
            className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${valgt.hmsAvvik ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="mt-0.5 text-indigo-600">
              {valgt.hmsAvvik ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-400" />}
            </div>
            <div>
              <p className="font-bold text-slate-800">HMS & Avvikshistorikk</p>
              <p className="text-sm text-slate-500 mt-1">Liste over alle lukkede og åpne avvik, inkludert tiltaksbeskrivelser og risikoanalyser.</p>
            </div>
          </div>

          {/* Valg 3 */}
          <div 
            onClick={() => toggleValg('personalLister')}
            className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${valgt.personalLister ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="mt-0.5 text-indigo-600">
              {valgt.personalLister ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-400" />}
            </div>
            <div>
              <p className="font-bold text-slate-800">Personallister og Politiattester</p>
              <p className="text-sm text-slate-500 mt-1">Oversikt over ansatte med bekreftelse på fremvist og godkjent politiattest (skjuler sensitive detaljer).</p>
            </div>
          </div>

          {/* Valg 4 (Pedagogisk plan) */}
          <div 
            onClick={() => toggleValg('pedagogiskPlan')}
            className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${valgt.pedagogiskPlan ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="mt-0.5 text-indigo-600">
              {valgt.pedagogiskPlan ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-400" />}
            </div>
            <div>
              <p className="font-bold text-slate-800">Pedagogisk årsplan & Rammeplanforankring</p>
              <p className="text-sm text-slate-500 mt-1">Vedlegg med progresjonsplaner for de 7 fagområdene og overganger barnehage-skole.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
          <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Merk:</strong> Rapporten genereres som en signert PDF i henhold til GDPR. Sensitive personopplysninger i avvik anonymiseres automatisk for eksternt tilsyn.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button 
            type="button"
            onClick={handleForhandsvisPdf}
            className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 p-4 rounded-xl font-bold text-base transition-colors border border-slate-300 cursor-pointer"
          >
            <Eye size={20} />
            <span>Forhåndsvis PDF</span>
          </button>

          <button 
            type="button"
            onClick={handleEksportPdf}
            disabled={genererer || (!valgt.bemanningsnorm && !valgt.hmsAvvik && !valgt.personalLister && !valgt.pedagogiskPlan)}
            className="flex-[2] flex items-center justify-center space-x-2 bg-indigo-600 text-white p-4 rounded-xl font-bold text-base sm:text-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 shadow-md cursor-pointer"
          >
            {genererer ? (
              <span className="animate-pulse flex items-center space-x-2">
                <Printer size={20} className="animate-spin" />
                <span>Bygger og lagrer PDF...</span>
              </span>
            ) : (
              <>
                <Download size={22} />
                <span>Generer og lagre PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Tilsynseksport;
