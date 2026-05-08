/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthScreen } from './components/AuthScreen';
import { MainLayout } from './components/MainLayout';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'update'>('login');

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'PASSWORD_RECOVERY') {
        setInitialAuthMode('update');
      }

      if (currentUser && event !== 'SIGNED_OUT') {
        fetchUserData(currentUser.id);
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is code for 'no rows returned'
        throw error;
      }
      
      if (data) {
        setUserData(data);
      } else {
        // Create profile for new social login users
        const { data: newUser } = await supabase.auth.getUser();
        if (newUser.user) {
          const profileData = {
            id: newUser.user.id,
            email: newUser.user.email,
            role: 'fan',
            display_name: newUser.user.email?.split('@')[0] || '익명',
            is_verified: true,
            fans_count: 0
          };
          await supabase.from('users').insert([profileData]);
          setUserData(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-brand" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-main">
      <AnimatePresence mode="wait">
        {!user || (!userData && initialAuthMode !== 'update') ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthScreen 
              onComplete={(data) => setUserData(data)} 
              initialMode={initialAuthMode}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MainLayout user={user} userData={userData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
