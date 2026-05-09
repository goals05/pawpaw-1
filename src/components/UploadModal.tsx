import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyPetImage } from '../services/ai';

interface UploadModalProps {
  user: any;
  userData: any;
  onClose: () => void;
}

export function UploadModal({ user, userData, onClose }: UploadModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'failed' | 'passed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setImage(base64.split(',')[1]); // Just the data part
        setStatus('idle');
        setErrorMessage('');
        setCanSkip(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!image || loading) return;
    setLoading(true);
    setStatus('verifying');
    setCanSkip(false);

    try {
      // 1. AI Verification
      const mimeType = preview?.split(';')[0].split(':')[1] || 'image/jpeg';
      const aiResult = await verifyPetImage(image, mimeType);

      if (aiResult.passed === true) {
        // Pass directly to saving logic
        await performSave();
      } else {
        setStatus('failed');
        setErrorMessage(aiResult.reason || 'AI가 사진 속 식구가 누구인지 헷갈려하네요.');
        setCanSkip(aiResult.canSkip !== false);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorStatus(err.message || '업로드 중 오류가 발생했습니다.');
    }
  };

  const finalizeUpload = async () => {
    if (loading && status !== 'failed') return;
    await performSave();
  };

  const performSave = async () => {
    setLoading(true);
    try {
      if (!preview) throw new Error('업로드할 사진이 유효하지 않습니다.');

      const postData = {
        butler_id: user.id,
        butler_name: userData.display_name || user.email?.split('@')[0] || '포 집사',
        image_url: preview,
        caption,
        hearts_count: 0,
      };

      const { error: dbError } = await supabase
        .from('posts')
        .insert([postData]);

      if (dbError) throw dbError;
      
      setStatus('passed');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorStatus(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      // setLoading(false); // Handled by onClose or error
    }
  };

  const setErrorStatus = (msg: string) => {
    setStatus('failed');
    setErrorMessage(msg);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl border border-border-base flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-base shrink-0">
          <button onClick={onClose} className="p-2 text-text-sub hover:bg-bg-alt rounded-2xl transition-all">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-black text-brand-brown tracking-tighter uppercase">POST MOMENT</h2>
          <button 
            onClick={handleUpload}
            disabled={!image || loading}
            className="px-5 py-2 bg-brand text-white text-[11px] font-black uppercase tracking-widest rounded-xl disabled:opacity-30 transition-all shadow-md shadow-brand/10 active:scale-95"
          >
            SHARE
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div 
            onClick={() => status !== 'verifying' && fileInputRef.current?.click()}
            className={`relative aspect-square rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${preview ? 'border-transparent shadow-sm' : 'border-border-base bg-bg-alt hover:bg-brand/5 group'}`}
          >
            {preview ? (
              <>
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                <AnimatePresence>
                  {status === 'verifying' && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/70 backdrop-blur-[4px] flex flex-col items-center justify-center p-8 text-center"
                    >
                      <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                      <p className="font-black text-brand-brown text-sm tracking-tight uppercase">Scanning for cuteness...</p>
                      <p className="text-[10px] text-text-sub mt-1 font-medium">AI가 우리 식구인지 정밀하게 확인 중입니다.</p>
                    </motion.div>
                  )}
                  {status === 'failed' && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[#FFF5F5]/95 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                      <p className="font-black text-red-900 text-sm tracking-tight uppercase">Hold on!</p>
                      <p className="text-[10px] text-red-600 mt-1 font-medium leading-relaxed">{errorMessage}</p>
                      <div className="mt-6 flex flex-col gap-2 w-full px-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="w-full py-2.5 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-transform"
                        >
                          Try Different Photo
                        </button>
                        {canSkip && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); finalizeUpload(); }}
                            className="w-full py-2.5 bg-white text-text-sub/50 hover:text-text-sub border border-border-base rounded-xl text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                          >
                            우리 식구가 확실해요! (검사 건너뛰기)
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {status === 'passed' && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[#F2F9F1]/95 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <CheckCircle2 className="w-12 h-12 text-brand mb-4" />
                      <p className="font-black text-brand-brown text-sm tracking-tight uppercase">Perfect!</p>
                      <p className="text-[10px] text-brand/80 mt-1 font-medium">포집사 인증이 완료되었습니다.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Camera className="w-10 h-10 text-brand" />
                </div>
                <p className="text-[11px] font-black text-text-sub uppercase tracking-widest">Select Memory</p>
                <p className="text-[9px] text-text-sub/60 mt-1 font-medium">AI-powered verification</p>
              </>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*" 
          />

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sub uppercase tracking-widest ml-1 px-1">Caption</label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-5 py-4 bg-bg-alt border border-transparent focus:border-brand focus:bg-white rounded-[24px] outline-none transition-all resize-none h-28 text-sm placeholder:text-text-sub/50"
              placeholder="지금 이 순간을 짧게 남겨주세요..."
            />
          </div>

          <div className="bg-bg-alt p-5 rounded-[24px] border border-border-base">
            <h4 className="text-[10px] font-black text-brand-brown uppercase flex items-center gap-1.5 mb-2 tracking-widest">
              <AlertCircle className="w-3.5 h-3.5 text-brand" /> Policy
            </h4>
            <ul className="text-[10px] text-text-sub space-y-1 font-medium leading-relaxed opacity-80">
              <li>• 발바닥, 귀, 털 무늬 등 반려동물의 신체 일부가 잘 보여야 합니다.</li>
              <li>• 사람만 있는 사진이나 부적절한 콘텐츠는 업로드가 제한됩니다.</li>
              <li>• AI가 판단하기 어려운 경우에만 건너뛰기 기능이 활성화됩니다.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
