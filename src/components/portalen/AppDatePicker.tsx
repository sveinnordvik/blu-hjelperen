import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Check } from 'lucide-react';

interface AppDatePickerProps {
  value?: string; // Format: DD.MM.YYYY
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  onOpenChange?: (open: boolean) => void;
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

const WEEK_DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

// Parse DD.MM.YYYY into Date object
function parseNorwegianDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
      return new Date(year, month, day);
    }
  }
  return null;
}

// Format Date object to DD.MM.YYYY
function formatNorwegianDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

// Calculate age from DD.MM.YYYY
export function calculateAge(dateStr?: string): number | null {
  if (!dateStr) return null;
  const birthDate = parseNorwegianDate(dateStr);
  if (!birthDate) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  value = '',
  onChange,
  label = 'Fødselsdato',
  placeholder = 'Velg dato (DD.MM.YYYY)...',
  minYear = 1945,
  maxYear = new Date().getFullYear(),
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
  };

  // Initialize view month/year based on existing value or default to a reasonable adult birth year (e.g. 1990)
  const parsedDate = parseNorwegianDate(value);
  const [viewYear, setViewYear] = useState<number>(() => parsedDate ? parsedDate.getFullYear() : 1992);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedDate ? parsedDate.getMonth() : 4);

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        toggleOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Generate years list
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  // Days calculations
  // First day of month
  const firstDay = new Date(viewYear, viewMonth, 1);
  // In JS: 0=Sun, 1=Mon, ..., 6=Sat. In Norway, week starts on Monday (index 0).
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  // Total days in current month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Days in previous month
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    const formatted = formatNorwegianDate(selected);
    onChange(formatted);
    toggleOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const age = calculateAge(value);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
        {age !== null && (
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            {age} år
          </span>
        )}
      </div>

      {/* TRIGGER DISPLAY FIELD */}
      <div 
        onClick={() => toggleOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen 
            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm' 
            : 'border-slate-300 hover:border-indigo-400'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <CalendarIcon size={16} />
          </div>
          <span className={`text-sm ${value ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
            {value || placeholder}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
              title="Fjern dato"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            Kalender
          </span>
        </div>
      </div>

      {/* KALENDER POPUP */}
      {isOpen && (
        <div className="absolute z-[120] left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 w-76 sm:w-84 animate-in fade-in zoom-in-95 duration-150">
          
          {/* HEADER: MÅNED & ÅR-VELGER */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Forrige måned"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center space-x-1.5">
              {/* Velg måned */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 text-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>

              {/* Velg år (Superpraktisk for fødselsdatoer!) */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 text-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Neste måned"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* UKEDAGER (Man - Søn) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-500">
            {WEEK_DAYS.map((wd) => (
              <div key={wd} className="py-1">{wd}</div>
            ))}
          </div>

          {/* DAGER-GRID */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Gråede dager fra forrige måned */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => {
              const prevDay = prevMonthDays - startDayOfWeek + i + 1;
              return (
                <div key={`prev-${i}`} className="py-2 text-center text-slate-300 font-medium select-none">
                  {prevDay}
                </div>
              );
            })}

            {/* Dager i aktiv måned */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = parsedDate && 
                                parsedDate.getDate() === day && 
                                parsedDate.getMonth() === viewMonth && 
                                parsedDate.getFullYear() === viewYear;
              
              const today = new Date();
              const isToday = today.getDate() === day && 
                              today.getMonth() === viewMonth && 
                              today.getFullYear() === viewYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-2 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-600 ring-offset-1'
                      : isToday 
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-300 hover:bg-indigo-100'
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* FOOTER MED HURTIGVALG */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {value ? `Valgt: ${value}` : 'Ingen dato valgt'}
            </span>
            <div className="flex space-x-2">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-semibold transition cursor-pointer"
                >
                  Fjern
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// --- KOMBINERT DATO & TIDSPUNKT-PILLE ---
export interface DateTimeCombinedPickerProps {
  dateValue?: string;
  timeValue?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  placeholderDate?: string;
  placeholderTime?: string;
  timePresets?: string[];
  minYear?: number;
  maxYear?: number;
}

export const DateTimeCombinedPicker: React.FC<DateTimeCombinedPickerProps> = ({
  dateValue = '',
  timeValue = '',
  onDateChange,
  onTimeChange,
  label = 'Møtedato & Tidspunkt',
  placeholderDate = 'Velg dato...',
  placeholderTime = '12:30 - 13:30',
  timePresets = [
    '08:30 - 09:30',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:30 - 12:30',
    '12:30 - 13:30',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00'
  ],
  minYear = 2020,
  maxYear = new Date().getFullYear() + 5
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = parseNorwegianDate(dateValue);
  const [viewYear, setViewYear] = useState<number>(() => parsedDate ? parsedDate.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parsedDate ? parsedDate.getMonth() : new Date().getMonth());

  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [dateValue]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
        setIsTimeDropdownOpen(false);
      }
    }
    if (isCalendarOpen || isTimeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen, isTimeDropdownOpen]);

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    onDateChange(formatNorwegianDate(selected));
    setIsCalendarOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
            Dato & Klokkeslett
          </span>
        </label>
      )}

      {/* EN SAMLET, ELEGANT PILLE */}
      <div className="bg-white border border-slate-300 hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 rounded-xl shadow-2xs flex items-stretch divide-x divide-slate-200 transition-all">
        
        {/* VENSTRE DEL: DATOVELGER */}
        <div 
          onClick={() => {
            setIsTimeDropdownOpen(false);
            setIsCalendarOpen(!isCalendarOpen);
          }}
          className="flex-1 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition rounded-l-xl select-none"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1 text-indigo-600 bg-indigo-50 rounded-md shrink-0">
              <CalendarIcon size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold leading-tight">Møtedato</span>
              <span className={`text-xs font-bold truncate ${dateValue ? 'text-slate-800' : 'text-slate-400'}`}>
                {dateValue || placeholderDate}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition shrink-0 ml-1">
            Kalender
          </span>
        </div>

        {/* HØYRE DEL: KLOKKESLETT / TIDSPUNKT */}
        <div className="flex-1 px-3 py-2 flex items-center space-x-2 bg-white rounded-r-xl relative">
          <div className="p-1 text-purple-600 bg-purple-50 rounded-md shrink-0">
            <Clock size={15} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold leading-tight">Tidspunkt</span>
            <input 
              type="text" 
              value={timeValue}
              onChange={(e) => onTimeChange(e.target.value)}
              onFocus={() => {
                setIsCalendarOpen(false);
                setIsTimeDropdownOpen(true);
              }}
              placeholder={placeholderTime}
              className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Valgmeny for hurtigtidspunkter */}
          <button
            type="button"
            onClick={() => {
              setIsCalendarOpen(false);
              setIsTimeDropdownOpen(!isTimeDropdownOpen);
            }}
            className="text-[10px] font-bold text-slate-500 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-2 py-0.5 rounded transition shrink-0 cursor-pointer"
            title="Velg forhåndsdefinert tidspunkt"
          >
            Tid
          </button>
        </div>

      </div>

      {/* KALENDER POPUP */}
      {isCalendarOpen && (
        <div className="absolute z-[140] left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 w-76 sm:w-80 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center space-x-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-500">
            {WEEK_DAYS.map((wd) => (
              <div key={wd} className="py-1">{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - startDayOfWeek + i + 1;
              return (
                <div key={`prev-${i}`} className="text-center py-2 text-xs text-slate-300 font-medium">
                  {dayNum}
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = parsedDate && 
                parsedDate.getDate() === day && 
                parsedDate.getMonth() === viewMonth && 
                parsedDate.getFullYear() === viewYear;

              return (
                <button
                  key={`cur-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`text-center py-2 text-xs rounded-xl font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onDateChange(formatNorwegianDate(today));
                setIsCalendarOpen(false);
              }}
              className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold transition cursor-pointer"
            >
              I dag
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition cursor-pointer"
            >
              Lukk
            </button>
          </div>
        </div>
      )}

      {/* HURTIGVALG FOR KLOKKESLETT DROPDOWN */}
      {isTimeDropdownOpen && (
        <div className="absolute z-[140] right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 w-56 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-700">
            <span>Vanlige møtetidspunkter</span>
            <button 
              type="button"
              onClick={() => setIsTimeDropdownOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {timePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onTimeChange(preset);
                  setIsTimeDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                  timeValue === preset 
                    ? 'bg-purple-100 text-purple-900' 
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <span>{preset}</span>
                {timeValue === preset && <Check size={13} className="text-purple-700" />}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AppDatePicker;

