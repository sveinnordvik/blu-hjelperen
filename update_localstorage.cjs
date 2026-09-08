const fs = require('fs');
let code = fs.readFileSync('src/components/tools/Samarbeidsverktoy.tsx', 'utf8');

const oldState = `const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');`;

const newState = `const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const saved = localStorage.getItem('blu_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    try {
      return localStorage.getItem('blu_activeGroupId') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('blu_groups', JSON.stringify(groups));
    } catch {}
  }, [groups]);

  useEffect(() => {
    try {
      if (activeGroupId) {
        localStorage.setItem('blu_activeGroupId', activeGroupId);
      } else {
        localStorage.removeItem('blu_activeGroupId');
      }
    } catch {}
  }, [activeGroupId]);`;

code = code.replace(oldState, newState);

fs.writeFileSync('src/components/tools/Samarbeidsverktoy.tsx', code);
console.log("Replaced groups and activeGroupId state with localStorage enabled version.");
