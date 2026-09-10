import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Brain, ArrowRight, CheckCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

export interface PedagogicalProfile {
  frameworkFocus: string;
  coreValues: string[];
}

interface WelcomeGuideProps {
  user: User | null;
  onComplete: () => void;
}

export default function WelcomeGuide({ user, onComplete }: WelcomeGuideProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<PedagogicalProfile>({
    frameworkFocus: '',
    coreValues: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      onComplete();
      return;
    }
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || 'unknown@example.com',
        hasCompletedOnboarding: true,
        pedagogicalProfile: profile
      }, { merge: true });
      onComplete(); // Skjuler guiden når data er lagret
    } catch (error) {
      console.error("Feil ved lagring av profil:", error);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleValue = (value: string) => {
    setProfile(prev => ({
      ...prev,
      coreValues: prev.coreValues.includes(value)
        ? prev.coreValues.filter(v => v !== value)
        : [...prev.coreValues, value]
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full border border-slate-100"
      >
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
              <BookOpen className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Velkommen til BLU-hjelperen</h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
                Din digitale medstudent og faglige støttespiller. Før vi starter, 
                trenger Super-Veilederen å kjenne til ditt pedagogiske ståsted for å gi deg best mulig råd.
              </p>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center w-full transition-all shadow-md shadow-blue-500/20 active:scale-[0.99]"
            >
              Start prinsipp-sjekken <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Hva er ditt didaktiske fokus?</h2>
                <p className="text-xs sm:text-sm text-slate-500">Velg ditt faglige tyngdepunkt og kjerneverdier</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Rammeplan-fokus</label>
              <select 
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                value={profile.frameworkFocus}
                onChange={(e) => setProfile({...profile, frameworkFocus: e.target.value})}
              >
                <option value="">Velg kjerneområde...</option>
                <option value="Lek og medvirkning">Lek og barns medvirkning</option>
                <option value="Danning og omsorg">Danning og omsorg</option>
                <option value="Uterom og nærmiljø">Uterom og nærmiljø som læringsarena</option>
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-sm font-medium text-slate-700">Kjerneverdier (velg 2-3)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Anerkjennelse', 'Inkludering', 'Sokratisk dialog', 'Progresjon'].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(value)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between ${
                      profile.coreValues.includes(value) 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{value}</span>
                    {profile.coreValues.includes(value) && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={!profile.frameworkFocus || profile.coreValues.length === 0 || isSaving}
              className="mt-6 bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center w-full disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99]"
            >
              {isSaving ? 'Lagrer profil...' : 'Fullfør profil'} <CheckCircle className="ml-2 w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
