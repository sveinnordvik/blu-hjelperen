import React from 'react';
import MagazineChapterLayout from './MagazineChapterLayout';
import { Smile, Leaf, Users } from 'lucide-react';

export default function GeneratePDFDocument({ exportConfig }: { exportConfig: any }) {
  return (
    <div className="pdf-document">
      
      {/* KAPITTEL 1: Om barnehagen */}
      <MagazineChapterLayout
        chapterNumber="Kapittel 1"
        title="Velkommen til oss"
        subtitle="Om barnehagen, visjon og hovedmål"
        imageSrc="/images/gapahuk-lek.jpg"
        imageTag="Natur & Utforskning"
        imageCaption="Turdager i nærmiljøet gir rom for mestring og bevegelsesglede"
        pageNumber={3}
      >
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Vår visjon</h4>
          <p className="text-xs text-slate-600">«Vi skaper trygge røtter for fremtiden, med lek og undring i sentrum.»</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Årets fokusområder</h4>
          <p className="text-xs text-slate-600">Vi benytter naturen og nærmiljøet som vår fremste arena for lek og læring.</p>
        </div>
      </MagazineChapterLayout>

      {/* KAPITTEL 2: Verdigrunnlag */}
      <MagazineChapterLayout
        chapterNumber="Kapittel 2"
        title="Verdigrunnlag og samarbeid"
        subtitle="Inkludering, mangfold, barns medvirkning og foreldresamarbeid"
        imageSrc="/images/felles-lek.jpg"
        imageTag="Fellesskap"
        imageCaption="OMSORG OG GODT FELLESSKAP I NÆRT SAMARBEID MED HJEMMET"
        pageNumber={4}
      >
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Users size={16} className="text-emerald-600" />
            Foreldresamarbeid
          </h4>
          <p className="text-xs text-slate-600">Et godt og åpent foreldresamarbeid er avgjørende for barnas trygghet og trivsel.</p>
        </div>
      </MagazineChapterLayout>

    </div>
  );
}
