import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'STUDENTN' | 'STYRERN' | 'PEDLEDERN' | 'FAGARBEIDERN' | 'ASSISTENTN' | 'VIKARN';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  canSwitch: boolean;
  isSvein: boolean;
  isPortalBeta: boolean;
  hasBluAccess: boolean;
  currentUserEmail: string | null;
}

const RoleContext = createContext<RoleContextType>({
  role: 'STYRERN',
  setRole: () => {},
  canSwitch: false,
  isSvein: false,
  isPortalBeta: false,
  hasBluAccess: true,
  currentUserEmail: null,
});

export const RoleProvider: React.FC<{ 
  children: React.ReactNode; 
  canSwitch: boolean;
  isSvein?: boolean;
  isPortalBeta?: boolean;
  hasBluAccess?: boolean;
  currentUserEmail?: string | null;
}> = ({ 
  children, 
  canSwitch, 
  isSvein = false, 
  isPortalBeta = false,
  hasBluAccess = true,
  currentUserEmail = null 
}) => {
  const [role, setRole] = useState<Role>(() => {
    try {
      const saved = sessionStorage.getItem('blu_active_role') as Role;
      if (saved === 'STUDENTN' && !hasBluAccess) return 'STYRERN';
      return saved || 'STYRERN';
    } catch {
      return 'STYRERN';
    }
  });

  useEffect(() => {
    if (role === 'STUDENTN' && !hasBluAccess) {
      setRole('STYRERN');
      return;
    }
    sessionStorage.setItem('blu_active_role', role);
  }, [role, hasBluAccess]);

  return (
    <RoleContext.Provider value={{ role, setRole, canSwitch, isSvein, isPortalBeta, hasBluAccess, currentUserEmail }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
