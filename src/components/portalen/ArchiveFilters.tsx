import React, { useState } from 'react';

interface ArchiveFiltersProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  category?: string;
  onCategoryChange?: (val: string) => void;
  categories?: string[];
  department?: string;
  onDepartmentChange?: (val: string) => void;
  departments?: string[];
  startDate?: string;
  onStartDateChange?: (val: string) => void;
  endDate?: string;
  onEndDateChange?: (val: string) => void;
  totalResultsCount?: number;
}

export default function ArchiveFilters({
  search: propSearch,
  onSearchChange,
  category: propCategory,
  onCategoryChange,
  categories = [],
  department: propDepartment,
  onDepartmentChange,
  departments = [],
  startDate: propStartDate,
  onStartDateChange,
  endDate: propEndDate,
  onEndDateChange,
  totalResultsCount
}: ArchiveFiltersProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalCategory, setInternalCategory] = useState('Alle kategorier');
  const [internalDepartment, setInternalDepartment] = useState('Alle avdelinger');
  const [internalStartDate, setInternalStartDate] = useState('');
  const [internalEndDate, setInternalEndDate] = useState('');

  const search = propSearch !== undefined ? propSearch : internalSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setInternalSearch(val);
  };

  const category = propCategory !== undefined ? propCategory : internalCategory;
  const handleCategoryChange = (val: string) => {
    if (onCategoryChange) onCategoryChange(val);
    else setInternalCategory(val);
  };

  const department = propDepartment !== undefined ? propDepartment : internalDepartment;
  const handleDepartmentChange = (val: string) => {
    if (onDepartmentChange) onDepartmentChange(val);
    else setInternalDepartment(val);
  };

  const startDate = propStartDate !== undefined ? propStartDate : internalStartDate;
  const handleStartDateChange = (val: string) => {
    if (onStartDateChange) onStartDateChange(val);
    else setInternalStartDate(val);
  };

  const endDate = propEndDate !== undefined ? propEndDate : internalEndDate;
  const handleEndDateChange = (val: string) => {
    if (onEndDateChange) onEndDateChange(val);
    else setInternalEndDate(val);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-b border-slate-200 rounded-2xl shadow-sm mb-4">
      {/* Eksisterende søk (fra skissen) */}
      <div className="relative flex-grow max-w-sm">
        <input 
          type="text" 
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Søk i arkivet (tittel, person, notat)..." 
          className="w-full pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-600 outline-none"
        />
        {/* Enkelt søkeikon */}
        <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Eksisterende dropdowns */}
      <select 
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white outline-none cursor-pointer"
      >
        <option value="alle">Alle kategorier</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select 
        value={department}
        onChange={(e) => handleDepartmentChange(e.target.value)}
        className="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white outline-none cursor-pointer"
      >
        <option value="alle">Alle avdelinger</option>
        {departments.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* NYTT: Datofiltrering (Date Range) */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-slate-500 font-medium">Periode:</span>
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <span className="text-slate-400">-</span>
        <input 
          type="date" 
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              handleStartDateChange('');
              handleEndDateChange('');
            }}
            title="Nullstill datoer"
            className="text-xs text-slate-400 hover:text-slate-600 px-1 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {totalResultsCount !== undefined && (
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl ml-2">
          ✓ {totalResultsCount} funnet
        </span>
      )}
    </div>
  );
}
