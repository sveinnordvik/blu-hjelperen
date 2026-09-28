import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Check, 
  GraduationCap, 
  School, 
  Users, 
  Sparkles, 
  BookOpen, 
  Heart, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Sliders,
  Type,
  Layout,
  Tag
} from 'lucide-react';
import { 
  PresentationBrandingSettings, 
  DEFAULT_BRANDING_SETTINGS, 
  BRANDING_PRESETS,
  TopBadgeIconType 
} from '../../lib/presentationSettings';

interface PresentationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PresentationBrandingSettings;
  onUpdateSettings: (newSettings: PresentationBrandingSettings) => void;
  focusedElement?: 1 | 2 | 3 | 4 | null;
}

export const PresentationSettingsModal: React.FC<PresentationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  focusedElement = null
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'all' | 'presets'>('all');

  const updateSetting = <K extends keyof PresentationBrandingSettings>(
    key: K, 
    value: PresentationBrandingSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value
    });
  };

  const handleApplyPreset = (presetSettings: PresentationBrandingSettings) => {
    onUpdateSettings({ ...presetSettings });
  };

  const handleResetToDefault = () => {
    onUpdateSettings({ ...DEFAULT_BRANDING_SETTINGS });
  };

  const renderBadgeIcon = (iconType: TopBadgeIconType) => {
    switch (iconType) {
      case 'school': return <School className="w-3.5 h-3.5" />;
      case 'users': return <Users className="w-3.5 h-3.5" />;
      case 'sparkles': return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'book': return <BookOpen className="w-3.5 h-3.5" />;
      case 'heart': return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case 'none': return null;
      case 'cap':
      default:
        return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Innstillinger for presentasjon
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Rediger eller skjul merker, undertitler og bunntekst etter anledning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            title="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FANER / HURTIGVELGER */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-900 shadow-2xs border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Elementer & Tekster (1–4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white text-indigo-900 shadow-2xs border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ferdige maler (Foreldremøte, Fagdag...)
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="Tilbakestill alle felter til BLU standard"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Nullstill</span>
          </button>
        </div>

        {/* MODAL INNHOLD */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {activeTab === 'presets' ? (
            /* PRESETS-VISNING */
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                Velg en forhåndsinnstilling som passer anledningen
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {BRANDING_PRESETS.map(preset => {
                  const isMatching = 
                    settings.topBadgeText === preset.settings.topBadgeText &&
                    settings.showTopBadge === preset.settings.showTopBadge &&
                    settings.showCategoryBadge === preset.settings.showCategoryBadge;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.settings)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isMatching
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{preset.name}</span>
                          {isMatching && (
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md">
                              Valgt nå
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isMatching ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* REDIGER ALLE 4 ELEMENTER */
            <div className="space-y-4">
              
              {/* ELEMENT 1: TOPP-MERKE (HOVED-BADGE) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                focusedElement === 1 
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30' 
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Topp-merke (Oppe til venstre)
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSetting('showTopBadge', !settings.showTopBadge)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      settings.showTopBadge
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {settings.showTopBadge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{settings.showTopBadge ? 'Synlig' : 'Skjult'}</span>
                  </button>
                </div>

                {settings.showTopBadge && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                        Tekst i topp-merket:
                      </span>
                      <input 
                        type="text"
                        value={settings.topBadgeText}
                        onChange={(e) => updateSetting('topBadgeText', e.target.value)}
                        placeholder="F.eks. BLU • Barnehagelærerutdanningen eller Foreldremøte"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                        Ikon i topp-merket:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['cap', 'school', 'users', 'sparkles', 'book', 'heart', 'none'] as TopBadgeIconType[]).map((iconKey) => {
                          const isSel = settings.topBadgeIcon === iconKey;
                          return (
                            <button
                              key={iconKey}
                              type="button"
                              onClick={() => updateSetting('topBadgeIcon', iconKey)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {renderBadgeIcon(iconKey)}
                              <span className="capitalize">{iconKey === 'none' ? 'Uten ikon' : iconKey}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ELEMENT 2: KATEGORI / UNDERTYPE-BADGE (OVER TITTEL PÅ SLIDE 1) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                focusedElement === 2 
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30' 
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Undertype-merke (Over tittel på slide 1)
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSetting('showCategoryBadge', !settings.showCategoryBadge)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      settings.showCategoryBadge
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {settings.showCategoryBadge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{settings.showCategoryBadge ? 'Synlig' : 'Skjult'}</span>
                  </button>
                </div>

                {settings.showCategoryBadge && (
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                      Tekst for undertype / kategori:
                    </span>
                    <input 
                      type="text"
                      value={settings.categoryBadgeText}
                      onChange={(e) => updateSetting('categoryBadgeText', e.target.value)}
                      placeholder="F.eks. Akademisk presentasjon, Informasjon & dialog, Faglig refleksjon"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              {/* ELEMENT 3: SLIDE- OG LAYOUT-TAG (NEDE TIL HØYRE) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                focusedElement === 3 
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30' 
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Layout-tag (Nede til høyre: TITLE • Slide 1)
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSetting('showLayoutTag', !settings.showLayoutTag)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      settings.showLayoutTag
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {settings.showLayoutTag ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{settings.showLayoutTag ? 'Synlig' : 'Skjult'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                  Viser layouttype og slidenummer nede til høyre. Slås ofte av for å gi et mer ryddig og minimalistisk uttrykk på projektor.
                </p>

                {settings.showLayoutTag && (
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                      Valgfri egendefinert tekst (la stå tom for å bruke standard layout/slide):
                    </span>
                    <input 
                      type="text"
                      value={settings.layoutTagCustomText || ''}
                      onChange={(e) => updateSetting('layoutTagCustomText', e.target.value)}
                      placeholder="La stå tom for automatisk (f.eks. TITLE • Slide 1), eller skriv eget"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              {/* ELEMENT 4: BUNNTEKST / FOOTER (NEDE TIL VENSTRE) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                focusedElement === 4 
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30' 
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                      4
                    </span>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Bunntekst / Footer (Nede til venstre)
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSetting('showFooter', !settings.showFooter)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      settings.showFooter
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {settings.showFooter ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{settings.showFooter ? 'Synlig' : 'Skjult'}</span>
                  </button>
                </div>

                {settings.showFooter && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                        Prefiks / Navn i bunnteksten:
                      </span>
                      <input 
                        type="text"
                        value={settings.footerText}
                        onChange={(e) => updateSetting('footerText', e.target.value)}
                        placeholder="F.eks. BLU-Hjelperen, ditt navn eller barnehagens navn"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input 
                        type="checkbox"
                        checked={settings.showSlideTitleInFooter}
                        onChange={(e) => updateSetting('showSlideTitleInFooter', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Inkluder gjeldende lysbildetittel etter prefikset (f.eks. «{settings.footerText || 'BLU'} • Tittel»)
                      </span>
                    </label>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs text-slate-500 font-medium">
            Endringer oppdateres direkte på lysbildet
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Ferdig
          </button>
        </div>

      </div>
    </div>
  );
};
