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
import { Plus, LogOut, Trophy, XCircle, Trash2, History, Search, Medal, Award, Edit2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Competition {
  id: string;
  name: string;
  wins: number;
  losses: number;
  userId: string;
  medal?: 'gold' | 'silver' | 'bronze' | 'copper' | 'none';
}

interface Match {
  id: string;
  competitionId: string;
  result: 'win' | 'loss';
  timestamp: any;
  opponent?: string;
  round?: string;
}

const BATTLE_ROUNDS = ['Filtros', '16vos', '8vos', '4tos', 'Semis', 'Final', 'Réplica', 'Exhibición'];

export default function Dashboard({ user }: { user: User }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [opponents, setOpponents] = useState<{ [key: string]: string }>({});
  const [rounds, setRounds] = useState<{ [key: string]: string }>({});
  const [opponentSearch, setOpponentSearch] = useState('');
  
  // Emergency Manage Mode States
  const [manageMode, setManageMode] = useState(false);
  const [editingOpp, setEditingOpp] = useState<string | null>(null);
  const [editOppVal, setEditOppVal] = useState('');
  const [deletingOpp, setDeletingOpp] = useState<string | null>(null);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompName, setEditCompName] = useState('');
  const [globalWipeConfirm, setGlobalWipeConfirm] = useState<string | null>(null);

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
    const opponentName = opponents[compId]?.trim() || '';
    const roundName = rounds[compId] || BATTLE_ROUNDS[0];
    
    const payload: any = {
      competitionId: compId,
      result,
      userId: user.uid,
      timestamp: serverTimestamp(),
      round: roundName
    };
    if (opponentName) {
      payload.opponent = opponentName;
    }

    await addDoc(collection(db, 'matches'), payload);

    const compRef = doc(db, 'competitions', compId);
    await updateDoc(compRef, {
      [result === 'win' ? 'wins' : 'losses']: increment(1)
    });

    setOpponents(prev => ({ ...prev, [compId]: '' }));
  };

  const deleteCompetition = async (id: string) => {
    await deleteDoc(doc(db, 'competitions', id));
    
    // Auto-cleanup: Delete all matches tied to this competition to prevent ghost stats
    const matchesToDelete = matches.filter(m => m.competitionId === id);
    for (const m of matchesToDelete) {
      await deleteDoc(doc(db, 'matches', m.id));
    }
    
    setDeletingId(null);
  };

  const deleteMatch = async (match: Match) => {
    // Delete the match itself
    await deleteDoc(doc(db, 'matches', match.id));
    
    // Decrease the win/loss count from the corresponding competition
    const compRef = doc(db, 'competitions', match.competitionId);
    const comp = competitions.find(c => c.id === match.competitionId);
    if (comp) {
      await updateDoc(compRef, {
        [match.result === 'win' ? 'wins' : 'losses']: increment(-1)
      });
    }
    
    setDeletingMatchId(null);
  };

  const toggleMedal = async (compId: string, currentMedal: string | undefined, clickedMedal: string) => {
    const newMedal = currentMedal === clickedMedal ? 'none' : clickedMedal;
    await updateDoc(doc(db, 'competitions', compId), { medal: newMedal });
  };

  const globalStats = (() => {
    const wins = competitions.reduce((acc, c) => acc + c.wins, 0);
    const losses = competitions.reduce((acc, c) => acc + c.losses, 0);
    const total = wins + losses;
    const rate = total === 0 ? 0 : Math.round((wins / total) * 100);
    return { wins, losses, total, rate };
  })();

  const medalStats = {
    gold: competitions.filter(c => c.medal === 'gold').length,
    silver: competitions.filter(c => c.medal === 'silver').length,
    bronze: competitions.filter(c => c.medal === 'bronze').length,
    copper: competitions.filter(c => c.medal === 'copper').length,
  };

  const opponentStats = (() => {
    const stats: Record<string, { wins: number; losses: number; total: number }> = {};
    matches.forEach(m => {
      if (!m.opponent) return;
      const key = m.opponent.toUpperCase();
      if (!stats[key]) stats[key] = { wins: 0, losses: 0, total: 0 };
      if (m.result === 'win') stats[key].wins += 1;
      else stats[key].losses += 1;
      stats[key].total += 1;
    });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  })();

  const filteredOpponents = opponentStats.filter(([name]) => 
    name.includes(opponentSearch.toUpperCase())
  );

  const renameOpponent = async (oldName: string) => {
    if (!editOppVal.trim() || editOppVal.toUpperCase() === oldName) {
      setEditingOpp(null);
      return;
    }
    const matchesToUpdate = matches.filter(m => m.opponent?.toUpperCase() === oldName);
    for (const m of matchesToUpdate) {
      await updateDoc(doc(db, 'matches', m.id), { opponent: editOppVal });
    }
    setEditingOpp(null);
  };

  const purgeOpponent = async (name: string) => {
    const matchesToDelete = matches.filter(m => m.opponent?.toUpperCase() === name);
    for (const m of matchesToDelete) {
      await deleteMatch(m); // safely decrement wins/losses
    }
    setDeletingOpp(null);
  };

  const saveCompName = async (id: string) => {
    if (editCompName.trim()) {
      await updateDoc(doc(db, 'competitions', id), { name: editCompName });
    }
    setEditingCompId(null);
  };

  const handleGlobalWipe = async (section: string) => {
    if (section === 'activity') {
      const ms = matches.map(m => deleteDoc(doc(db, 'matches', m.id)));
      const cs = competitions.map(c => updateDoc(doc(db, 'competitions', c.id), { wins: 0, losses: 0 }));
      await Promise.all([...ms, ...cs]);
    } else if (section === 'opponents') {
      const withOpp = matches.filter(m => !!m.opponent);
      for (const m of withOpp) {
        await deleteMatch(m);
      }
    }
    setGlobalWipeConfirm(null);
  };

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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setManageMode(!manageMode)}
            className={`transition-colors text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${manageMode ? 'text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.5)] font-bold' : 'text-muted-foreground hover:text-white'}`}
          >
            <ShieldAlert className="w-3 h-3" />
            {manageMode ? 'EXIT SECURE MNG' : 'DATA MANAGER'}
          </button>
          <span className="text-muted/30">|</span>
          <button 
            onClick={() => signOut(auth)}
            className="text-muted-foreground hover:text-white transition-colors text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            <LogOut className="w-3 h-3" />
            Leave
          </button>
        </div>
      </header>

      {/* Winrate Hero Card */}
      <div className="bento-card col-span-2 row-span-2 justify-center items-center text-center flex flex-col">
        <div className="bento-label w-full text-left">Global Performance</div>
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <div className="winrate-value">{globalStats.rate}%</div>
          <div className="text-sm text-muted-foreground mt-[-10px] uppercase tracking-widest">
            Overall WinRate
          </div>
        </div>
        
        <div className="grid grid-cols-3 w-full gap-2 mt-4 pt-4 border-t border-white/5">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Battles</span>
            <span className="text-lg font-black text-white">{globalStats.total}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Wins</span>
            <span className="text-lg font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{globalStats.wins}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Losses</span>
            <span className="text-lg font-black text-muted">{globalStats.losses}</span>
          </div>
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
            <div key={match.id} className="flex justify-between items-center py-2 border-b border-white/5 text-[13px] group">
              <div className="flex flex-col">
                <span className="uppercase tracking-wider">
                  {competitions.find(c => c.id === match.competitionId)?.name || 'Deleted Track'}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  {match.opponent && `VS: ${match.opponent} | `}ROUND: {match.round || 'N/A'}
                </span>
              </div>
              <div className="flex items-center">
                <span className={`font-bold uppercase ${match.result === 'win' ? 'text-white' : 'text-muted'}`}>
                  {match.result === 'win' ? 'Victory' : 'Defeat'}
                </span>
                {deletingMatchId === match.id ? (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => deleteMatch(match)} className="text-red-500 font-bold hover:text-red-400">✓</button>
                    <button onClick={() => setDeletingMatchId(null)} className="text-muted-foreground font-bold hover:text-white">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingMatchId(match.id)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-4 p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="text-center py-10 text-muted text-[10px] uppercase tracking-widest">
              Silence...
            </div>
          )}
          {manageMode && matches.length > 0 && (
            <div className="pt-4 mt-2 border-t border-red-500/30 pb-2">
              {globalWipeConfirm === 'activity' ? (
                <div className="flex gap-2">
                  <button onClick={() => handleGlobalWipe('activity')} className="flex-1 bg-red-900 hover:bg-red-500 transition-colors text-white font-bold text-[10px] py-2 uppercase">CONFIRM WIPE</button>
                  <button onClick={() => setGlobalWipeConfirm(null)} className="flex-1 bg-black hover:bg-white/10 transition-colors text-white font-bold text-[10px] py-2 border border-white/20 uppercase">CANCEL</button>
                </div>
              ) : (
                <button onClick={() => setGlobalWipeConfirm('activity')} className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors"><ShieldAlert className="w-3 h-3" /> CLEAR ALL ACTIVITY LOGS</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Checklist Card replacing with Trophy Room */}
      <div className="bento-card col-span-1">
        <div className="bento-label">Trophy Room</div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="flex flex-col items-center justify-center py-2 bg-black/40 border border-white/5 rounded transition-colors hover:bg-black">
            <Medal className="w-5 h-5 text-[#FFD700] mb-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
            <span className="text-white font-bold text-sm leading-none">{medalStats.gold}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 bg-black/40 border border-white/5 rounded transition-colors hover:bg-black">
            <Medal className="w-5 h-5 text-[#C0C0C0] mb-1" />
            <span className="text-white font-bold text-sm leading-none">{medalStats.silver}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 bg-black/40 border border-white/5 rounded transition-colors hover:bg-black">
            <Medal className="w-5 h-5 text-[#CD7F32] mb-1" />
            <span className="text-white font-bold text-sm leading-none">{medalStats.bronze}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 bg-black/40 border border-white/5 rounded transition-colors hover:bg-black">
            <Award className="w-5 h-5 text-[#8B4513] mb-1" />
            <span className="text-white font-bold text-sm leading-none">{medalStats.copper}</span>
          </div>
        </div>
      </div>

      {/* Opponent Focus (H2H) Card replacing Dist Card */}
      <div className="bento-card col-span-1 justify-between flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="bento-label !mb-0">Opponents Data</div>
          <Search className="w-3 h-3 text-muted-foreground" />
        </div>
        <input 
          type="text" 
          value={opponentSearch}
          onChange={(e) => setOpponentSearch(e.target.value)}
          placeholder="Search MC..."
          className="text-entry text-[10px] py-1.5 px-2 mb-2 mt-0 w-full uppercase tracking-widest"
        />
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide mt-1">
          {filteredOpponents.length > 0 ? (
            filteredOpponents.map(([name, stats]) => {
              const wr = Math.round((stats.wins / stats.total) * 100);
              return (
                <div key={name} className="flex justify-between items-center border-b border-white/10 pb-2 min-h-[40px]">
                  {editingOpp === name ? (
                    <div className="flex w-full gap-2 items-center">
                      <input 
                        className="text-entry text-[11px] py-1 px-2 m-0 flex-1 uppercase" 
                        value={editOppVal} 
                        autoFocus
                        onChange={(e) => setEditOppVal(e.target.value)} 
                      />
                      <button onClick={() => renameOpponent(name)} className="text-green-500 font-bold uppercase text-[10px] hover:scale-110">SAVE</button>
                      <button onClick={() => setEditingOpp(null)} className="text-muted-foreground font-bold uppercase text-[10px] hover:scale-110">ESC</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="font-bold text-[12px] uppercase flex items-center gap-2">
                          {name}
                          {manageMode && (
                             <span className="flex gap-2.5">
                               <button onClick={() => { setEditingOpp(name); setEditOppVal(name); }} className="text-muted hover:text-[#FFD700] transition-colors" title="Edit Data"><Edit2 className="w-3 h-3" /></button>
                               {deletingOpp === name ? (
                                 <div className="flex gap-2 ml-1">
                                   <button onClick={() => purgeOpponent(name)} className="text-red-500 font-bold hover:text-white transition-colors" title="Confirm Purge">✓</button>
                                   <button onClick={() => setDeletingOpp(null)} className="text-muted font-bold transition-colors hover:text-white">✕</button>
                                 </div>
                               ) : (
                                 <button onClick={() => setDeletingOpp(name)} className="text-muted hover:text-red-500 transition-colors" title="Delete Match Data v. Opponent"><Trash2 className="w-3 h-3" /></button>
                               )}
                             </span>
                          )}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase">{stats.wins}W - {stats.losses}L</span>
                      </div>
                      <span className={`font-black text-[12px] opacity-80 ${wr >= 50 ? 'text-white' : 'text-muted'}`}>{wr}% WR</span>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted text-[10px] uppercase tracking-widest italic">
              No Adversaries Logged
            </div>
          )}
          {manageMode && filteredOpponents.length > 0 && (
            <div className="pt-2 border-t border-red-500/30 pb-2 mt-4">
              {globalWipeConfirm === 'opponents' ? (
                <div className="flex gap-2">
                  <button onClick={() => handleGlobalWipe('opponents')} className="flex-1 bg-red-900 hover:bg-red-500 transition-colors text-white font-bold text-[10px] py-1.5 uppercase">CONFIRM WIPE</button>
                  <button onClick={() => setGlobalWipeConfirm(null)} className="flex-1 bg-black hover:bg-white/10 transition-colors text-white font-bold text-[10px] py-1.5 border border-white/20 uppercase">CANCEL</button>
                </div>
              ) : (
                <button onClick={() => setGlobalWipeConfirm('opponents')} className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors"><ShieldAlert className="w-3 h-3" /> CLEAR OPPONENTS DATA</button>
              )}
            </div>
          )}
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
                className={`bento-card group transition-all duration-300 ${manageMode ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}
              >
                <div className="flex justify-between items-start mb-6 w-full">
                  <div className="flex-1 mr-4">
                    {manageMode && editingCompId === comp.id ? (
                      <div className="flex gap-2 items-center mb-1">
                        <input 
                          className="text-entry my-0 text-sm py-1 flex-1 px-2 uppercase font-bold" 
                          value={editCompName} 
                          onChange={(e) => setEditCompName(e.target.value)} 
                          autoFocus
                        />
                        <button onClick={() => saveCompName(comp.id)} className="text-green-500 font-bold text-[10px] uppercase hover:scale-110 transition-transform">SAVE</button>
                        <button onClick={() => setEditingCompId(null)} className="text-muted-foreground font-bold text-[10px] uppercase hover:scale-110 transition-transform">ESC</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold uppercase tracking-wide leading-tight break-words">{comp.name}</h4>
                        {manageMode && (
                          <button onClick={() => { setEditingCompId(comp.id); setEditCompName(comp.name); }} className="text-muted hover:text-[#FFD700] transition-colors" title="Rename Track">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        {comp.wins}W - {comp.losses}L
                      </p>
                      <div className="flex gap-2 border-l border-white/10 pl-3">
                        <button onClick={() => toggleMedal(comp.id, comp.medal, 'gold')} className={`transition-all hover:scale-110 ${comp.medal === 'gold' ? 'opacity-100 text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]' : 'opacity-20 grayscale hover:grayscale-0 hover:opacity-100 text-[#FFD700]'}`}><Medal className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleMedal(comp.id, comp.medal, 'silver')} className={`transition-all hover:scale-110 ${comp.medal === 'silver' ? 'opacity-100 text-[#C0C0C0] drop-shadow-[0_0_5px_rgba(192,192,192,0.6)]' : 'opacity-20 grayscale hover:grayscale-0 hover:opacity-100 text-[#C0C0C0]'}`}><Medal className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleMedal(comp.id, comp.medal, 'bronze')} className={`transition-all hover:scale-110 ${comp.medal === 'bronze' ? 'opacity-100 text-[#CD7F32] drop-shadow-[0_0_5px_rgba(205,127,50,0.6)]' : 'opacity-20 grayscale hover:grayscale-0 hover:opacity-100 text-[#CD7F32]'}`}><Medal className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleMedal(comp.id, comp.medal, 'copper')} className={`transition-all hover:scale-110 ${comp.medal === 'copper' ? 'opacity-100 text-[#8B4513] drop-shadow-[0_0_5px_rgba(139,69,19,0.6)]' : 'opacity-20 grayscale hover:grayscale-0 hover:opacity-100 text-[#8B4513]'}`}><Award className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black">{rate}%</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-tighter">Win Rate</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={opponents[comp.id] || ''}
                      onChange={(e) => setOpponents(prev => ({ ...prev, [comp.id]: e.target.value }))}
                      placeholder="Opponent MC (Optional)"
                      className="text-entry text-xs py-2 px-3 mt-0 text-center uppercase tracking-widest placeholder:lowercase placeholder:capitalize flex-1 min-w-0"
                    />
                    <select
                      value={rounds[comp.id] || BATTLE_ROUNDS[0]}
                      onChange={(e) => setRounds(prev => ({ ...prev, [comp.id]: e.target.value }))}
                      className="neo-button appearance-none py-2 px-2 text-[10px] text-center m-0 border-border bg-black text-white cursor-pointer w-[80px]"
                    >
                      {BATTLE_ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
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
