import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Key, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reglas estáticas reactivas a los cambios de password
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    spec: /[^A-Za-z0-9]/.test(password)
  };

  const isPasswordValid = Object.values(rules).every(Boolean);
  const isRegisterValid = username.trim().length > 0 && username.toLowerCase() !== 'admin' && isPasswordValid;
  const isSubmitDisabled = loading || (!isLogin && !isRegisterValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && !isRegisterValid) return;
    
    setLoading(true);

    if (isLogin) {
      let email = `${username.toLowerCase()}@numeland.com`;
      let pass = password;
      
      // Mapeo seguro y especial para la cuenta admin
      if (username === 'admin' && password === 'admin') {
        email = 'admin@numeland.com';
        pass = 'admin123456';
      }

      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (err: any) {
        // Auto-crear admin la primera vez si no existe
        if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') && username === 'admin') {
          try {
            await createUserWithEmailAndPassword(auth, email, pass);
          } catch (createErr: any) {
            setError(createErr.message);
          }
        } else {
          setError('Credenciales inválidas o usuario no encontrado.');
        }
      }
    } else {
      // Modo Registro
      const email = `${username.toLowerCase()}@numeland.com`;
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Este nombre de usuario ya está en uso.');
        } else {
          setError(err.message);
        }
      }
    }
    
    setLoading(false);
  };

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="max-w-md w-full text-center space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-7xl font-black tracking-[0.2em] leading-none">NUME<br />LAND</h1>
        <p className="text-muted-foreground font-light tracking-[0.4em] uppercase text-[10px]">
          Competition & WinRate Tracker
        </p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="p-8 bg-card border border-border rounded-[4px] space-y-6"
      >
        <div className="flex justify-center gap-6 border-b border-border pb-4">
          <button 
            type="button" 
            onClick={() => toggleMode(true)}
            className={`text-xs uppercase tracking-[0.2em] transition-colors ${isLogin ? 'text-white font-bold' : 'text-muted-foreground hover:text-white'}`}
          >
            Access Data
          </button>
          <span className="text-muted-foreground">|</span>
          <button 
            type="button" 
            onClick={() => toggleMode(false)}
            className={`text-xs uppercase tracking-[0.2em] transition-colors ${!isLogin ? 'text-white font-bold' : 'text-muted-foreground hover:text-white'}`}
          >
            New System
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-entry mt-1"
              placeholder={isLogin ? 'admin' : 'new_user'}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-entry mt-1"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="text-[10px] uppercase tracking-widest space-y-2 mt-4 bg-black p-4 border border-border relative">
                  <div className="text-muted-foreground mb-3 font-bold border-b border-muted pb-2">Security Requirements:</div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${rules.length ? 'text-[#00ff00]' : 'text-muted-foreground'}`}>
                    <span>{rules.length ? '✓' : '○'}</span> Min 8 Characters
                  </div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${rules.upper ? 'text-[#00ff00]' : 'text-muted-foreground'}`}>
                    <span>{rules.upper ? '✓' : '○'}</span> Uppercase [A-Z]
                  </div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${rules.lower ? 'text-[#00ff00]' : 'text-muted-foreground'}`}>
                    <span>{rules.lower ? '✓' : '○'}</span> Lowercase [a-z]
                  </div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${rules.num ? 'text-[#00ff00]' : 'text-muted-foreground'}`}>
                    <span>{rules.num ? '✓' : '○'}</span> Number [0-9]
                  </div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${rules.spec ? 'text-[#00ff00]' : 'text-muted-foreground'}`}>
                    <span>{rules.spec ? '✓' : '○'}</span> Special Character
                  </div>
                  {username.toLowerCase() === 'admin' && (
                    <div className="text-red-500 mt-3 pt-2 border-t border-red-500/20">
                      ⚠ The 'admin' username is reserved.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {error && (
            <div className="text-red-500 text-[10px] uppercase tracking-wider text-center bg-red-500/10 p-3 rounded border border-red-500/20 leading-relaxed mt-2 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitDisabled}
            className={`neo-button w-full flex items-center justify-center gap-3 py-4 text-xs font-black tracking-[0.3em] uppercase mt-6 transition-all duration-300 ${
              isSubmitDisabled 
              ? 'opacity-30 cursor-not-allowed hover:bg-black hover:text-white active:translate-x-0 active:translate-y-0' 
              : ''
            }`}
          >
            {isLogin ? <Key className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Processing...' : (isLogin ? 'Enter The Void' : 'Initialize')}
          </button>
        </form>
      </motion.div>
      
      <div className="text-[9px] text-muted-foreground uppercase tracking-[0.4em] opacity-30">
        Established 2024 // Numeland System
      </div>
    </div>
  );
}
