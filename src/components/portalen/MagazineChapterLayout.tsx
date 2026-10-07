import React from 'react';

interface MagazineChapterLayoutProps {
  id?: string;
  chapterNumber: string;
  title: string;
  subtitle: string;
  pageNumber: number | string;
  totalPages?: number | string;
  layoutVariant?: 'image-right' | 'image-left' | 'hero-top' | 'text-focus' | 'full-page-text';
  // Fleksibel grafikk: Enten et bilde, eller et skreddersydd React-komponent (diagram/illustrasjon)
  imageSrc?: string; 
  VisualComponent?: React.ReactNode; 
  imageTag?: string;
  imageCaption?: string;
  className?: string;
  children: React.ReactNode;
}

export default function MagazineChapterLayout({ 
  id,
  chapterNumber, 
  title, 
  subtitle, 
  pageNumber,
  totalPages = 11,
  layoutVariant = 'image-right',
  imageSrc, 
  VisualComponent,
  imageTag, 
  imageCaption, 
  className = '',
  children 
}: MagazineChapterLayoutProps) {
  
  // Hjelpefunksjon for å rendere grafikken (Bilde eller Diagram) uavhengig av layout
  const renderGraphics = (extraClasses = "") => (
    <div className={`relative rounded-2xl overflow-hidden shadow-md group bg-slate-50 flex flex-col border border-slate-100 ${extraClasses}`}>
      {VisualComponent ? (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50/30 to-emerald-50/30">
          {VisualComponent}
        </div>
      ) : (
        <>
          <img 
            src={imageSrc || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80"} 
            alt={imageTag || title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b]/95 via-[#1e1b4b]/20 to-transparent flex flex-col justify-end p-5 md:p-8">
            {imageTag && (
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-2">
                {imageTag}
              </span>
            )}
            {imageCaption && (
              <p className="text-white font-bold text-sm leading-snug drop-shadow-md">
                {imageCaption}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div 
      id={id}
      className={`bg-white w-[210mm] h-[297mm] shadow-2xl rounded-sm p-12 flex flex-col justify-between relative mx-auto overflow-hidden shrink-0 transition-all ${className}`}
    >
      
      {/* Header */}
      <div className="mb-6 shrink-0">
        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
          {chapterNumber}
        </h3>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1e1b4b] tracking-tight mb-2 leading-tight">
          {title}
        </h1>
        <p className="text-slate-500 font-medium text-xs md:text-sm">{subtitle}</p>
        <div className="w-full h-px bg-emerald-600/30 mt-4"></div>
      </div>

      {/* DYNAMISK LAYOUT-RENDERER */}
      <div className="flex-1 min-h-0 flex flex-col">
        
        {/* VARIANT: HERO TOP (Stort toppbilde, tekst i kolonner under) */}
        {layoutVariant === 'hero-top' && (
          <div className="flex flex-col h-full gap-5 flex-1 min-h-0">
            {renderGraphics("h-64 md:h-72 w-full shrink-0")}
            <div className="grid grid-cols-2 gap-5 flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-2">
              {children}
            </div>
          </div>
        )}

        {/* VARIANT: IMAGE RIGHT (Klassisk magasin) */}
        {layoutVariant === 'image-right' && (
          <div className="grid grid-cols-12 gap-8 h-full flex-1 min-h-0">
            <div className="col-span-7 flex flex-col gap-4 overflow-y-auto scrollbar-hide pb-2 pr-1">
              {children}
            </div>
            <div className="col-span-5 h-full min-h-[440px]">
              {renderGraphics("h-full w-full min-h-full")}
            </div>
          </div>
        )}

        {/* VARIANT: IMAGE LEFT (Speilvendt, bryter monotonien) */}
        {layoutVariant === 'image-left' && (
          <div className="grid grid-cols-12 gap-8 h-full flex-1 min-h-0">
            <div className="col-span-5 h-full min-h-[440px]">
              {renderGraphics("h-full w-full min-h-full")}
            </div>
            <div className="col-span-7 flex flex-col gap-4 overflow-y-auto scrollbar-hide pb-2 pl-1">
              {children}
            </div>
          </div>
        )}

        {/* VARIANT: TEXT FOCUS (Smalt bilde/grafikk, mye plass til tekst) */}
        {layoutVariant === 'text-focus' && (
          <div className="flex flex-col h-full gap-5 flex-1 min-h-0">
            <div className="overflow-y-auto scrollbar-hide pb-2 space-y-4 flex-1 pr-1">
              {children}
            </div>
            {renderGraphics("h-44 w-full shrink-0 mt-auto")}
          </div>
        )}

        {/* NY VARIANT: Ren tekstside (ingen grafikk, maksimerer plassen for PDF) */}
        {layoutVariant === 'full-page-text' && (
          <div className="flex-1 w-full h-full pb-4">
            {children}
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
        <span>Styringsdokument • {title}</span>
        <span>Side {pageNumber} / {totalPages}</span>
      </div>

    </div>
  );
}
