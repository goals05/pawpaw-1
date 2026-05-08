import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Grid, Heart, LogOut, Users, Settings, Award, MapPin, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileTabProps {
  user: any;
  userData: any;
}

export function ProfileTab({ user, userData }: ProfileTabProps) {
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'hearts'>('grid');
  const [loading, setLoading] = useState(true);
  const [fans, setFans] = useState<any[]>([]);
  const [myHearts, setMyHearts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch My Posts
    if (userData.role === 'butler') {
      const fetchMyPosts = async () => {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('butler_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setMyPosts(data);
        }
        setLoading(false);
      };

      fetchMyPosts();

      // Subscription
      const sub = supabase.channel('profile-posts')
        .on('postgres_changes' as any, { event: '*', table: 'posts', filter: `butler_id=eq.${user.id}` }, fetchMyPosts)
        .subscribe();
      
      return () => { supabase.removeChannel(sub); };
    } else {
      setLoading(false);
    }
  }, [user.id, userData.role]);

  useEffect(() => {
    // Fetch Fans
    const fetchFans = async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', user.id);

      if (!error && data) {
        setFans(data);
      }
    };

    fetchFans();
  }, [user.id]);

  // Fetch Liked Posts
  useEffect(() => {
    if (activeSubTab === 'hearts') {
      const fetchLikedPosts = async () => {
        const { data, error } = await supabase
          .from('hearts')
          .select('post_id, posts(*)')
          .eq('user_id', user.id);

        if (!error && data) {
          setLikedPosts(data.map((h: any) => h.posts).filter(Boolean));
        }
      };
      fetchLikedPosts();
    }
  }, [activeSubTab, user.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // Check which posts are liked by the user in current view
    const currentPosts = activeSubTab === 'grid' ? myPosts : likedPosts;
    
    currentPosts.forEach(async (post) => {
      const { data } = await supabase
        .from('hearts')
        .select('id')
        .match({ post_id: post.id, user_id: user.id })
        .single();
      
      if (data) {
        setMyHearts(prev => ({ ...prev, [post.id]: true }));
      }
    });
  }, [myPosts, likedPosts, user.id, activeSubTab]);

  const toggleHeart = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isHearted = !!myHearts[postId];
    const post = [...myPosts, ...likedPosts].find(p => p.id === postId);
    if (!post) return;

    // Optimistic UI update
    setMyHearts(prev => ({ ...prev, [postId]: !isHearted }));

    try {
      if (isHearted) {
        await supabase
          .from('hearts')
          .delete()
          .match({ post_id: postId, user_id: user.id });
          
        await supabase
          .from('posts')
          .update({ hearts_count: Math.max(0, (post.hearts_count || 0) - 1) })
          .eq('id', postId);
      } else {
        await supabase
          .from('hearts')
          .insert([{ post_id: postId, user_id: user.id }]);

        await supabase
          .from('posts')
          .update({ hearts_count: (post.hearts_count || 0) + 1 })
          .eq('id', postId);
      }
    } catch (err) {
      console.error("Heart toggle error:", err);
      setMyHearts(prev => ({ ...prev, [postId]: isHearted }));
    }
  };

  const displayPosts = activeSubTab === 'grid' ? myPosts : likedPosts;

  return (
    <div className="bg-bg-base min-h-full">
      {/* Profile Header */}
      <div className="bg-white px-6 pt-10 pb-8 border-b border-border-base">
        <div className="flex items-start justify-between mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-[32px] bg-bg-alt flex items-center justify-center border border-border-base shadow-sm">
              <UserIcon className="w-10 h-10 text-brand" />
            </div>
            {userData.role === 'butler' && (
              <div className="absolute -bottom-1 -right-1 bg-brand text-white p-2 rounded-2xl border-4 border-white shadow-md">
                <Award className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          
          <div className="flex gap-6 text-center pt-4">
            <div className="flex flex-col">
              <span className="text-xl font-black text-text-main leading-none">{myPosts.length}</span>
              <span className="text-[10px] font-black text-text-sub uppercase tracking-widest mt-1">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-text-main leading-none">{fans.length}</span>
              <span className="text-[10px] font-black text-text-sub uppercase tracking-widest mt-1">Fans</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="p-3 text-text-sub hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-text-main tracking-tight">{userData.display_name || user.email?.split('@')[0]}</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${userData.role === 'butler' ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
              {userData.role === 'butler' ? 'Butler' : 'Fan'}
            </span>
          </div>
          {userData.role === 'butler' && (
            <div className="space-y-1.5">
              <p className="text-sm text-text-main font-bold flex items-center gap-2">
                <span className="text-lg">🐾</span> {userData.pet_name}의 집사
              </p>
              {userData.hospital && (
                <div className="flex items-center gap-1.5 text-[11px] text-text-sub font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{userData.hospital}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button className="flex-1 py-4 bg-brand-brown text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-brown/10 active:scale-95 transition-transform">
            Edit Profile
          </button>
          <button className="px-4 py-4 bg-white text-text-main rounded-2xl border border-border-base hover:bg-bg-alt transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-base bg-white sticky top-0 z-10 transition-all">
        <button 
          onClick={() => setActiveSubTab('grid')}
          className={`flex-1 py-5 flex justify-center border-b-2 transition-all ${activeSubTab === 'grid' ? 'border-brand' : 'border-transparent opacity-30'}`}
        >
          <Grid className={`w-5 h-5 ${activeSubTab === 'grid' ? 'text-brand' : 'text-text-sub'}`} />
        </button>
        <button 
          onClick={() => setActiveSubTab('hearts')}
          className={`flex-1 py-5 flex justify-center border-b-2 transition-all ${activeSubTab === 'hearts' ? 'border-brand' : 'border-transparent opacity-30'}`}
        >
          <Heart className={`w-5 h-5 ${activeSubTab === 'hearts' ? 'text-brand' : 'text-text-sub'}`} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-border-base">
        {activeSubTab === 'hearts' && likedPosts.length === 0 ? (
          <div className="col-span-3 py-32 flex flex-col items-center justify-center bg-white rounded-b-[40px] text-text-sub">
            <Heart className="w-16 h-16 mb-6 opacity-5" />
            <p className="text-sm font-bold">좋아요 표시한 게시물이 없습니다</p>
          </div>
        ) : userData.role === 'fan' && activeSubTab === 'grid' ? (
          <div className="col-span-3 py-32 flex flex-col items-center justify-center bg-white rounded-b-[40px] text-text-sub">
            <Users className="w-16 h-16 mb-6 opacity-5" />
            <p className="text-sm font-bold">포 집사님들의 일상을 기다리고 있어요</p>
            <p className="text-[11px] mt-2 font-medium">마음에 드는 사진에 하트를 눌러보세요!</p>
          </div>
        ) : loading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-bg-alt animate-pulse rounded-sm" />
          ))
        ) : displayPosts.length === 0 ? (
          <div className="col-span-3 py-32 flex flex-col items-center justify-center bg-white rounded-b-[40px] text-text-sub">
            <Grid className="w-16 h-16 mb-6 opacity-5" />
            <p className="text-sm font-bold">첫 번째 추억을 기록해 보세요</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-bg-alt relative group overflow-hidden first:rounded-tl-[32px] last:rounded-br-[32px]"
            >
              <img 
                src={post.imageUrl} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" 
                alt="Pet photo" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-brand-brown/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button 
                  onClick={(e) => toggleHeart(post.id, e)}
                  className="flex items-center gap-1.5 text-white font-black text-sm scale-90 group-hover:scale-100 transition-transform bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/40"
                >
                  <Heart className={`w-5 h-5 ${myHearts[post.id] ? 'fill-[#FF8E8E] text-[#FF8E8E]' : 'fill-white text-white'}`} />
                  {post.hearts_count || 0}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
