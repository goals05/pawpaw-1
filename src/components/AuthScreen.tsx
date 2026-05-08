import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PawPrint } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onComplete: (userData: any) => void;
  initialMode?: 'login' | 'register' | 'reset' | 'update';
}

export function AuthScreen({ onComplete, initialMode = 'login' }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset' | 'update'>(initialMode);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'butler' | 'fan'>('fan');
  const [petName, setPetName] = useState('');
  const [hospital, setHospital] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('회원가입에 실패했습니다.');

        const userData = {
          id: data.user.id,
          email,
          role,
          pet_name: role === 'butler' ? petName : null,
          hospital: role === 'butler' ? hospital : null,
          display_name: role === 'butler' ? petName : email.split('@')[0],
          is_verified: true,
          fans_count: 0,
        };

        const { error: dbError } = await supabase
          .from('users')
          .insert([userData]);

        if (dbError) throw dbError;
        onComplete(userData);
      } else if (authMode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (!data.user) throw new Error('로그인에 실패했습니다.');

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          const userData = {
            id: data.user.id,
            email: data.user.email,
            role: 'fan',
            display_name: data.user.email?.split('@')[0] || '익명',
            is_verified: true,
            fans_count: 0,
          };
          await supabase.from('users').insert([userData]);
          onComplete(userData);
        } else {
          onComplete(profile);
        }
      } else if (authMode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setMessage('비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해주세요.');
      } else if (authMode === 'update') {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;
        setMessage('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
        setTimeout(() => setAuthMode('login'), 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(`구글 로그인 실패: ${err.message}. Supabase 대시보드에서 Redirect URLs에 현재 도메인이 추가되어 있는지 확인해주세요.`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-sm border border-border-base"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-brand rounded-2xl mb-4 text-white">
            <PawPrint className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-brand-brown tracking-tighter">PAWPAW</h1>
          <p className="text-text-sub text-sm font-medium mt-1">
            {authMode === 'reset' ? '비밀번호 재설정 요청' : 
             authMode === 'update' ? '새 비밀번호 설정' : 
             '오직 귀여움과 건강에만 집중하는 공간'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode !== 'update' && (
            <div>
              <label className="block text-xs font-bold text-text-sub uppercase tracking-widest mb-1 px-1">이메일</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 bg-bg-alt border border-border-base focus:border-brand focus:bg-white rounded-2xl outline-none transition-all placeholder:text-text-sub/50"
                placeholder="example@email.com"
                required
              />
            </div>
          )}

          {authMode !== 'reset' && authMode !== 'update' && (
            <div>
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="block text-xs font-bold text-text-sub uppercase tracking-widest">비밀번호</label>
                {authMode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className="text-[10px] font-bold text-brand hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 bg-bg-alt border border-border-base focus:border-brand focus:bg-white rounded-2xl outline-none transition-all placeholder:text-text-sub/50"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {authMode === 'update' && (
            <div>
              <label className="block text-xs font-bold text-text-sub uppercase tracking-widest mb-1 px-1">새 비밀번호</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-5 py-3 bg-bg-alt border border-border-base focus:border-brand focus:bg-white rounded-2xl outline-none transition-all placeholder:text-text-sub/50"
                placeholder="새 비밀번호 입력"
                required
              />
            </div>
          )}

          {authMode === 'register' && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2 p-1.5 bg-bg-alt rounded-2xl border border-border-base">
                <button
                  type="button"
                  onClick={() => setRole('fan')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${role === 'fan' ? 'bg-white shadow-sm text-brand' : 'text-text-sub'}`}
                >
                  포 팬 (시청자)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('butler')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${role === 'butler' ? 'bg-white shadow-sm text-brand' : 'text-text-sub'}`}
                >
                  포 집사 (보호자)
                </button>
              </div>

              {role === 'butler' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase tracking-widest mb-1 px-1">반려동물 이름 (증명용)</label>
                    <input 
                      type="text" 
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      className="w-full px-5 py-3 bg-bg-alt border border-border-base focus:border-brand focus:bg-white rounded-2xl outline-none transition-all"
                      placeholder="아이의 이름"
                      required={role === 'butler'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase tracking-widest mb-1 px-1">자주 가는 동물병원</label>
                    <input 
                      type="text" 
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      className="w-full px-5 py-3 bg-bg-alt border border-border-base focus:border-brand focus:bg-white rounded-2xl outline-none transition-all"
                      placeholder="평소 다니는 병원"
                      required={role === 'butler'}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-[11px] font-medium px-1 underline decoration-red-200">{error}</p>}
          {message && <p className="text-brand text-[11px] font-bold px-1">{message}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50 active:scale-95"
          >
            {loading ? '진행 중...' : (
              authMode === 'register' ? '시작하기' : 
              authMode === 'login' ? '들어오기' : 
              authMode === 'reset' ? '재설정 메일 보내기' : '비밀번호 변경하기'
            )}
          </button>
        </form>

        {(authMode === 'login' || authMode === 'register') && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-base"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white px-3 text-text-sub">PAW CONNECTION</span>
              </div>
            </div>

            <button 
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full py-3.5 border border-border-base text-brand-brown font-bold text-xs rounded-2xl hover:bg-bg-alt transition-colors flex items-center justify-center gap-2"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              구글 계정으로 연결하기
            </button>
          </>
        )}

        <div className="mt-8 text-center text-xs font-medium text-text-sub">
          {authMode === 'login' && (
            <>
              아직 식구가 아니신가요?
              <button 
                type="button"
                onClick={() => setAuthMode('register')}
                className="ml-2 text-brand font-black underline decoration-brand-base underline-offset-4"
              >
                지금 가입하기
              </button>
            </>
          )}
          {authMode === 'register' && (
            <>
              가입된 계정이 있으신가요?
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className="ml-2 text-brand font-black underline decoration-brand-base underline-offset-4"
              >
                로그인하기
              </button>
            </>
          )}
          {authMode === 'reset' && (
            <button 
              type="button"
              onClick={() => setAuthMode('login')}
              className="text-brand font-black underline decoration-brand-base underline-offset-4"
            >
              로그인 화면으로 돌아가기
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
