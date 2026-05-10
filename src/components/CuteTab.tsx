import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  butler_id: string;
  butler_name: string;
  image_url: string;
  caption: string;
  hearts_count: number;
  created_at: any;
}

export function CuteTab({ user }: { user: any }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [myHearts, setMyHearts] = useState<Record<string, boolean>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    };

    fetchPosts();

    // Setup subscription for real-time updates
    const subscription = supabase
      .channel('posts-all')
      .on('postgres_changes' as any, { event: '*', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchMyHeartsAndFollows = async () => {
      const [heartsRes, followsRes] = await Promise.all([
        supabase.from('hearts').select('post_id').eq('user_id', user.id),
        supabase.from('follows').select('following_id').eq('follower_id', user.id)
      ]);

      if (!heartsRes.error && heartsRes.data) {
        const heartsMap: Record<string, boolean> = {};
        heartsRes.data.forEach((h: any) => heartsMap[h.post_id] = true);
        setMyHearts(heartsMap);
      }

      if (!followsRes.error && followsRes.data) {
        const followsMap: Record<string, boolean> = {};
        followsRes.data.forEach((f: any) => followsMap[f.following_id] = true);
        setFollowingMap(followsMap);
      }
    };

    fetchMyHeartsAndFollows();
  }, [posts, user?.id]);

  const toggleHeart = async (postId: string) => {
    if (!user?.id) return;
    const isHearted = myHearts[postId];
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Optimistic UI Update
    setMyHearts(prev => ({ ...prev, [postId]: !isHearted }));
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, hearts_count: isHearted ? Math.max(0, (p.hearts_count || 0) - 1) : (p.hearts_count || 0) + 1 };
      }
      return p;
    }));

    try {
      if (isHearted) {
        const { error: heartErr } = await supabase
          .from('hearts')
          .delete()
          .match({ post_id: postId, user_id: user.id });
        if (heartErr) console.error("Heart delete error:", heartErr);
        
        await supabase
          .from('posts')
          .update({ hearts_count: Math.max(0, (post.hearts_count || 0) - 1) })
          .eq('id', postId);
      } else {
        const { error: heartErr } = await supabase
          .from('hearts')
          .insert([{ post_id: postId, user_id: user.id }]);
        if (heartErr) console.error("Heart insert error:", heartErr);

        await supabase
          .from('posts')
          .update({ hearts_count: (post.hearts_count || 0) + 1 })
          .eq('id', postId);
      }
    } catch (err) {
      console.error('Heart toggle error:', err);
      // Revert on error
      setMyHearts(prev => ({ ...prev, [postId]: isHearted }));
      setPosts(posts.map(p => p.id === postId ? post : p));
    }
  };

  const toggleFollow = async (butlerId: string) => {
    if (!user?.id || user.id === butlerId) return;
    const isFollowing = followingMap[butlerId];

    // Optimistic update
    setFollowingMap(prev => ({ ...prev, [butlerId]: !isFollowing }));

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: user.id, following_id: butlerId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: butlerId }]);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      // Revert optimistic update
      setFollowingMap(prev => ({ ...prev, [butlerId]: isFollowing }));
    }
  };

  const displayPosts = useMemo(() => {
    if (Object.keys(followingMap).length === 0) return posts;
    const followed = posts.filter(p => followingMap[p.butler_id]);
    const others = posts.filter(p => !followingMap[p.butler_id]);
    return [...followed, ...others];
  }, [posts, followingMap]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-bg-base">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-text-sub mt-2 font-medium">귀여움 충전 중...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-sub">
          <Heart className="w-12 h-12 mb-4 opacity-10" />
          <p className="font-medium text-sm">아직 올라온 사진이 없어요.</p>
          <p className="text-xs">첫 게시물의 주인공이 되어보세요!</p>
        </div>
      ) : (
        displayPosts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-border-base p-5"
          >
            <div className="px-1 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl bg-bg-alt flex items-center justify-center text-brand font-black text-[10px] border border-border-base">
                  {post.butler_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <span className="font-bold text-sm block leading-none">{post.butler_name}</span>
                  <span className="text-[10px] text-text-sub">@{post.butler_name?.toLowerCase()} • {post.created_at ? new Date(post.created_at).toLocaleDateString() : '방금 전'}</span>
                </div>
              </div>
              
              {user?.id !== post.butler_id && (
                <button
                  onClick={() => toggleFollow(post.butler_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                    followingMap[post.butler_id]
                      ? 'bg-brand/10 text-brand'
                      : 'bg-brand-brown text-white hover:bg-brand-brown/90'
                  }`}
                >
                  {followingMap[post.butler_id] ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="relative aspect-square bg-bg-alt rounded-[32px] overflow-hidden flex items-center justify-center border border-border-base">
              <img 
                src={post.image_url} 
                className="w-full h-full object-cover" 
                alt="Pet photo"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => toggleHeart(post.id)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-white/90 backdrop-blur-md rounded-full flex flex-col items-center justify-center shadow-lg border border-border-base group active:scale-90 transition-transform"
              >
                <Heart 
                  className={`w-6 h-6 transition-all ${myHearts[post.id] ? 'fill-[#FF8E8E] text-[#FF8E8E] scale-110' : 'text-text-sub hover:scale-110'}`} 
                />
                <span className={`text-[9px] font-black mt-0.5 ${myHearts[post.id] ? 'text-[#FF8E8E]' : 'text-text-sub'}`}>
                  {post.hearts_count || 0}
                </span>
              </button>
            </div>

            <div className="mt-4 px-2">
              {post.caption && (
                <p className="text-sm leading-relaxed text-text-main">
                  {post.caption}
                </p>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
