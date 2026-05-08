import { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Send, Loader2, Info, Navigation, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { getPetHealthAdvice } from '../services/ai';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface UrgentTabProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function UrgentTab({ messages, setMessages }: UrgentTabProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "강아지가 초콜릿을 먹었어요!",
    "고양이가 갑자기 구토를 해요.",
    "반려동물 심폐소생술 방법은?",
    "먹어도 되는 과일이 있나요?"
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const response = await getPetHealthAdvice(text, history);
      setMessages(prev => [...prev, { role: 'model', content: response || "응답을 가져오지 못했습니다." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "죄송합니다. 오류가 발생했습니다." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNearbySearch = () => {
    if (loading) return;
    
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleSend(`내 현재 위치(위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}) 주변의 24시 동물병원과 24시 약국을 찾아보고 리스트로 알려줘.`);
        },
        (error) => {
          handleSend("현재 위치를 가져올 수 없어. 주변의 일반적인 24시 동물병원과 약국 찾는 법을 알려줘.");
        }
      );
    } else {
      handleSend("내 주변의 24시 동물병원과 24시 약국 정보를 알려줘.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Header Info */}
      <div className="px-6 py-3 bg-bg-alt flex items-center gap-3 border-b border-border-base">
        <ShieldAlert className="w-5 h-5 text-brand" />
        <p className="text-[11px] font-bold text-brand-brown">긴급한 상황이라면 주변 24시 동물병원을 검색하세요.</p>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] px-5 py-4 rounded-[24px] shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand text-white rounded-tr-none' 
                    : 'bg-white text-text-main rounded-tl-none border border-border-base'
                }`}
              >
                <div className={`prose prose-sm prose-p:leading-relaxed ${msg.role === 'user' ? 'prose-invert' : 'prose-strong:text-brand prose-strong:font-bold prose-ul:list-disc prose-ul:pl-4'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white px-5 py-4 rounded-[24px] rounded-tl-none border border-border-base flex gap-1">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-1.5 h-1.5 bg-brand rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-brand rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-brand rounded-full" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input / Quick Replies Area */}
      <div className="p-6 bg-white border-t border-border-base space-y-4 shadow-xl">
        {messages.length < 3 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-4 py-2.5 bg-bg-alt text-brand-brown text-[11px] font-bold rounded-full hover:bg-brand/10 hover:text-brand transition-all border border-border-base"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="증상이나 궁금한 점을 적어주세요..."
            className="flex-1 px-6 py-4 bg-bg-alt rounded-full outline-none focus:bg-white border border-transparent focus:border-brand transition-all text-sm placeholder:text-text-sub"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="p-4 bg-brand text-white rounded-full shadow-lg shadow-brand/20 disabled:opacity-50 active:scale-90 transition-transform"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 py-2">
          <button 
            onClick={handleNearbySearch}
            disabled={loading}
            className="flex flex-col items-center gap-1 group disabled:opacity-50"
          >
            <div className="p-3 bg-bg-alt rounded-2xl group-hover:bg-brand/10 transition-all border border-border-base">
              <Navigation className="w-4 h-4 text-brand-brown group-hover:text-brand" />
            </div>
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">주변 24시</span>
          </button>
          <button 
            onClick={() => handleSend("반려동물이 절대 먹으면 안 되는 금기 음식 리스트와 이유를 알려줘.")}
            disabled={loading}
            className="flex flex-col items-center gap-1 group disabled:opacity-50"
          >
            <div className="p-3 bg-bg-alt rounded-2xl group-hover:bg-brand/10 transition-all border border-border-base">
              <Search className="w-4 h-4 text-brand-brown group-hover:text-brand" />
            </div>
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">금기 음식</span>
          </button>
          <button 
            onClick={() => handleSend("반려동물 응급상황별(기도폐쇄, 발작, 열사병 등) 핵심 응급처치 가이드를 요약해서 알려줘.")}
            disabled={loading}
            className="flex flex-col items-center gap-1 group disabled:opacity-50"
          >
            <div className="p-3 bg-bg-alt rounded-2xl group-hover:bg-brand/10 transition-all border border-border-base">
              <Info className="w-4 h-4 text-brand-brown group-hover:text-brand" />
            </div>
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">응급 처치</span>
          </button>
        </div>
      </div>
    </div>
  );
}
