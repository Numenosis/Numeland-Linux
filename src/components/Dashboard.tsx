import { useState, useEffect, FormEvent } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Plus, LogOut, Trophy, XCircle, Trash2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Competition {
  id: string;
  name: string;
  wins: number;
  losses: number;
  userId: string;
}

interface Match {
  id: string;
  competitionId: string;
  result: 'win' | 'loss';
  timestamp: any;
}

export default function Dashboard({ user }: { user: User }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'competitions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competition));
      setCompetitions(comps);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(
      collection(db, 'matches'), 
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      
      // Client-side sort to avoid requiring a composite index in Firestore setup
      m.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setMatches(m);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const addCompetition = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    
    await addDoc(collection(db, 'competitions'), {
      name: newCompName,
      wins: 0,
      losses: 0,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    setNewCompName('');
    setIsAdding(false);
  };

  const recordMatch = async (compId: string, result: 'win' | 'loss') => {
    await addDoc(collection(db, 'matches'), {
      competitionId: compId,
      result,
      userId: user.uid,
      timestamp: serverTimestamp()
    });

    const compRef = doc(db, 'competitions', compId);
    await updateDoc(compRef, {
      [result === 'win' ? 'wins' : 'losses']: increment(1)
    });
  };

  const deleteCompetition = async (id: string) => {
    await deleteDoc(doc(db, 'competitions', id));
    setDeletingId(null);
  };

  const globalWinRate = (() => {
    const totalWins = competitions.reduce((acc, c) => acc + c.wins, 0);
    const totalLosses = competitions.reduce((acc, c) => acc + c.losses, 0);
    const total = totalWins + totalLosses;
    return total === 0 ? 0 : Math.round((totalWins / total) * 100);
  })();

  return (
    <div className="bento-container">
      {/* Header */}
      <header className="col-span-full flex justify-between items-center border-b border-border pb-4 mb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-[0.2em]">NUMELAND</h1>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>ESTABLISHED 2024</span>
            <span className="opacity-30">|</span>
            <span>USER: {user.displayName ? user.displayName.toUpperCase().replace(' ', '_') : 'ADMIN'}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="text-muted-foreground hover:text-white transition-colors text-[10px] uppercase tracking-widest flex items-center gap-2"
        >
          <LogOut className="w-3 h-3" />
          Leave
        </button>
      </header>

      {/* Winrate Hero Card */}
      <div className="bento-card col-span-2 row-span-2 justify-center items-center text-center">
        <div className="bento-label">Global Performance</div>
        <div className="winrate-value">{globalWinRate}%</div>
        <div className="text-sm text-muted-foreground mt-[-10px] uppercase tracking-widest">
          Overall WinRate
        </div>
      </div>

      {/* Input Card */}
      <div className="bento-card col-span-2">
        <div className="bento-label">Log New Competition</div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold">Active Tracks</h3>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="neo-button text-[10px] uppercase tracking-widest"
            >
              {isAdding ? 'Cancel' : 'New Track'}
            </button>
          </div>
          
          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={addCompetition}
                className="flex gap-2 overflow-hidden"
              >
                <input 
                  type="text" 
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="Competition Name..."
                  className="text-entry flex-1 mt-0"
                />
                <button type="submit" className="neo-button">Add</button>
              </motion.form>
            )}
          </AnimatePresence>
          <div className="text-[11px] text-muted italic">Format: [Competition Name]</div>
        </div>
      </div>

      {/* History Card */}
      <div className="bento-card col-span-2 row-span-2">
        <div className="bento-label">Recent Activity</div>
        <div className="space-y-1 overflow-y-auto max-h-[300px] pr-2 scrollbar-hide">
          {matches.map((match) => (
            <div key={match.id} className="flex justify-between items-center py-2 border-b border-white/5 text-[13px]">
              <span className="uppercase tracking-wider">
                {competitions.find(c => c.id === match.competitionId)?.name || 'Unknown'}
              </span>
              <span className={`font-bold uppercase ${match.result === 'win' ? 'text-white' : 'text-muted'}`}>
                {match.result === 'win' ? 'Victory' : 'Defeat'}
              </span>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="text-center py-10 text-muted text-[10px] uppercase tracking-widest">
              Silence...
            </div>
          )}
        </div>
      </div>

      {/* Checklist Card */}
      <div className="bento-card col-span-1">
        <div className="bento-label">System Integrity</div>
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-white font-bold">✓</span> Frontend Validation
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-white font-bold">✓</span> Session Persistence
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-white font-bold">✓</span> DB Sync Active
          </div>
        </div>
      </div>

      {/* Dist Card */}
      <div className="bento-card col-span-1 justify-between">
        <div className="bento-label">Daily Intensity</div>
        <div className="flex items-end gap-1 h-[60px]">
          {[30, 50, 90, 40, 70, 20, 60].map((h, i) => (
            <div 
              key={i} 
              className={`flex-1 transition-all duration-300 ${h === 90 ? 'bg-white' : 'bg-muted'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="text-[10px] mt-2 text-muted uppercase tracking-tighter">
          MT W TH FR SA SU
        </div>
      </div>

      {/* Active Tracks - Expanded Section */}
      <div className="col-span-full mt-8 space-y-6">
        <h3 className="text-sm uppercase tracking-[0.4em] text-muted-foreground border-l-4 border-white pl-4">Active Tracks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((comp) => {
            const total = comp.wins + comp.losses;
            const rate = total === 0 ? 0 : Math.round((comp.wins / total) * 100);
            
            return (
              <motion.div 
                layout
                key={comp.id}
                className="bento-card group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-bold">{comp.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {comp.wins}W - {comp.losses}L
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black">{rate}%</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-tighter">Win Rate</div>
                  </div>
                </div>

                <div className="mt-6">
                  {deletingId === comp.id ? (
                    <div className="flex gap-2">
                       <button 
                        onClick={() => deleteCompetition(comp.id)}
                        className="flex-1 neo-button !bg-red-900 border-red-500 hover:!bg-red-500 hover:!text-white text-[10px] uppercase font-bold transition-colors"
                      >
                        Confirm Delete
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="flex-1 neo-button text-[10px] uppercase font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => recordMatch(comp.id, 'win')}
                        className="flex-1 neo-button bg-white text-black hover:bg-black hover:text-white text-[10px] uppercase font-bold"
                      >
                        Win
                      </button>
                      <button 
                        onClick={() => recordMatch(comp.id, 'loss')}
                        className="flex-1 neo-button text-[10px] uppercase font-bold"
                      >
                        Loss
                      </button>
                      <button 
                        onClick={() => setDeletingId(comp.id)}
                        className="p-2 text-muted-foreground hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

}
