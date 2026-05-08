import { useState } from 'react';
import { Heart, ShieldAlert, User as UserIcon, Plus } from 'lucide-react';
import { CuteTab } from './CuteTab';
import { UrgentTab } from './UrgentTab';
import { ProfileTab } from './ProfileTab';
import { UploadModal } from './UploadModal';
import { motion, AnimatePresence } from 'motion/react';

interface MainLayoutProps {
  user: any;
  userData: any;
}

export function MainLayout({ user, userData }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState<'cute' | 'urgent' | 'profile'>('cute');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'model', content: "안녕하세요! **PawPaw 케어 AI**입니다. 우리 아이의 건강이나 응급 상황에 대해 무엇이든 물어보세요.\n\n*주의: 위급한 상황일 경우 즉시 인근 동물병원을 방문하시는 것이 가장 중요합니다.*" }
  ]);

  const tabs = [
    { id: 'cute', icon: Heart, label: '귀여워요' },
    { id: 'urgent', icon: ShieldAlert, label: '긴급해요' },
    { id: 'profile', icon: UserIcon, label: '포포 피드' },
  ];

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-bg-base shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-border-base bg-white z-10">
        <h1 className="text-2xl font-black text-brand-brown tracking-tighter flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-[10px] text-white">🐾</div>
          PAWPAW
        </h1>
        {userData.role === 'butler' && (
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="p-2.5 bg-brand text-white rounded-2xl shadow-lg shadow-brand/20 hover:scale-105 transition-transform active:scale-95 border border-white/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'cute' && (
            <motion.div
              key="cute"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="h-full"
            >
              <CuteTab user={user} />
            </motion.div>
          )}
          {activeTab === 'urgent' && (
            <motion.div
              key="urgent"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="h-full"
            >
              <UrgentTab messages={chatMessages} setMessages={setChatMessages} />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="h-full"
            >
              <ProfileTab user={user} userData={userData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <div className="absolute bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-md border border-border-base rounded-[24px] px-4 flex justify-around items-center z-10 shadow-lg shadow-black/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex flex-col items-center gap-0.5 group"
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-brand' : 'text-text-sub group-hover:text-text-main'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
              </div>
              <span className={`text-[9px] font-black tracking-widest uppercase ${isActive ? 'text-brand' : 'text-text-sub'}`}>
                {tab.label === '귀여워요' ? 'CUTE' : tab.label === '긴급해요' ? 'CARE' : 'FEED'}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="w-1 h-1 bg-brand rounded-full absolute -bottom-1"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal 
          user={user} 
          userData={userData} 
          onClose={() => setIsUploadOpen(false)} 
        />
      )}
    </div>
  );
}
