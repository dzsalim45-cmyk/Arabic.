/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, BookOpen, RefreshCw, Bookmark, BookmarkPlus, BookmarkCheck, X, Search, Share2, ChevronRight, ChevronLeft } from "lucide-react";

interface WordData {
  word: string;
  definition: string;
  source: string;
  root: string;
  poetryContext?: string;
  poet?: string;
}

export default function App() {
  const [history, setHistory] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(currentIndex);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const wordData = currentIndex >= 0 && currentIndex < history.length ? history[currentIndex] : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenWords, setSeenWords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arabic_seen_words');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bookmarkedWords, setBookmarkedWords] = useState<WordData[]>(() => {
    try {
      const saved = localStorage.getItem('arabic_bookmarked_words');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem('arabic_seen_words', JSON.stringify(seenWords));
  }, [seenWords]);

  useEffect(() => {
    localStorage.setItem('arabic_bookmarked_words', JSON.stringify(bookmarkedWords));
  }, [bookmarkedWords]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wordData) return;
    setBookmarkedWords(prev => {
      const exists = prev.some(w => w.word === wordData.word);
      if (exists) {
        return prev.filter(w => w.word !== wordData.word);
      } else {
        return [wordData, ...prev];
      }
    });
  };

  const isBookmarked = wordData ? bookmarkedWords.some(w => w.word === wordData.word) : false;

  const searchSpecificWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearchOpen(false);
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `أريد شرحاً مفصلاً للكلمة العربية: "${searchQuery.trim()}". استخرج معناها من المعاجم الكلاسيكية (مثل لسان العرب أو المعجم الوسيط). أعد الكلمة، التعريف المفصل، المصدر، والجذر الثلاثي. وأيضاً، أورد بيتاً من الشعر العربي الفصيح يحتوي على الكلمة لتبيان سياق استخدامها، واذكر اسم الشاعر. إذا كانت الكلمة عامية أو بها خطأ إملائي، قم بتصحيحها لأقرب كلمة فصحى مناسبة.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The Arabic word itself." },
              definition: { type: Type.STRING, description: "Detailed explanation in Arabic." },
              source: { type: Type.STRING, description: "The dictionary name (e.g., لسان العرب)." },
              root: { type: Type.STRING, description: "The 3-letter root of the word." },
              poetryContext: { type: Type.STRING, description: "A classic Arabic poetry line using the word. Empty string if not found." },
              poet: { type: Type.STRING, description: "The name of the poet. Empty string if unknown." },
            },
            required: ["word", "definition", "source", "root"],
          },
        },
      });

      const jsonStr = response.text.trim();
      const parsed: WordData = JSON.parse(jsonStr);
      setHistory(prev => {
        const newHistory = [...prev.slice(0, currentIndexRef.current + 1), parsed];
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
      setSeenWords(prev => {
        const newSet = new Set([...prev, parsed.word]);
        return Array.from(newSet);
      });
      setSearchQuery("");
    } catch (err: any) {
      console.error("Error searching word:", err);
      const errorMsg = err?.message || JSON.stringify(err) || "";
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("exceeded your current quota")) {
        setError("لقد استنفدت الحد المسموح به (15 طلب / دقيقة). يرجى الانتظار لمدة دقيقة والمحاولة مجدداً.");
      } else {
        setError("عذراً، حدث خطأ أثناء البحث عن الكلمة. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomWord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arabicLetters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];
      const randomLetter = arabicLetters[Math.floor(Math.random() * arabicLetters.length)];
      const randomSeed = Math.floor(Math.random() * 1000000);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `اختر كلمة عربية فصحى وبليغة (نادرة أو جميلة) تبدأ بحرف "${randomLetter}" واشرح معناها من المعاجم الكلاسيكية (مثل لسان العرب أو المعجم الوسيط). (رقم البذرة العشوائي لضمان كلمة جديدة: ${randomSeed}). وأيضاً، أورد بيتاً من الشعر العربي الفصيح يحتوي على الكلمة لتبيان سياق استخدامها، واذكر اسم الشاعر.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The Arabic word itself." },
              definition: { type: Type.STRING, description: "Detailed explanation in Arabic." },
              source: { type: Type.STRING, description: "The dictionary name (e.g., لسان العرب)." },
              root: { type: Type.STRING, description: "The 3-letter root of the word." },
              poetryContext: { type: Type.STRING, description: "A classic Arabic poetry line using the word. Empty string if not found." },
              poet: { type: Type.STRING, description: "The name of the poet. Empty string if unknown." },
            },
            required: ["word", "definition", "source", "root"],
          },
        },
      });

      const jsonStr = response.text.trim();
      const parsed: WordData = JSON.parse(jsonStr);
      setHistory(prev => {
        const newHistory = [...prev.slice(0, currentIndexRef.current + 1), parsed];
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
      setSeenWords(prev => {
        const newSet = new Set([...prev, parsed.word]);
        return Array.from(newSet);
      });
    } catch (err: any) {
      console.error("Error fetching word:", err);
      const errorMsg = err?.message || JSON.stringify(err) || "";
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("exceeded your current quota")) {
        setError("لقد استنفدت الحد المسموح به (15 طلب / دقيقة). يرجى الانتظار لمدة دقيقة والمحاولة مجدداً.");
      } else {
        setError("عذراً، حدث خطأ أثناء جلب الكلمة. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  }, [seenWords]);

  useEffect(() => {
    if (history.length === 0 && !loading && !error) {
      fetchRandomWord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrevious = (e?: React.SyntheticEvent | Event) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentIndex > 0 && !loading) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = (e?: React.SyntheticEvent | Event) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentIndex < history.length - 1 && !loading) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleNewWord = (e?: React.SyntheticEvent | Event) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!loading) {
      fetchRandomWord();
    }
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            new Notification("بيان", {
              body: "تم تفعيل الإشعارات بنجاح. ستصلك كلمات عربية بليغة.",
            });
          }
        });
      }
    }
  };



  useEffect(() => {
    if (!notificationsEnabled) return;

    const interval = setInterval(async () => {
      try {
        const arabicLetters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];
        const randomLetter = arabicLetters[Math.floor(Math.random() * arabicLetters.length)];
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `اختر كلمة عربية فصحى وبليغة (نادرة أو جميلة) تبدأ بحرف "${randomLetter}" واشرح معناها من المعاجم الكلاسيكية (مثل لسان العرب أو المعجم الوسيط). (رقم البذرة العشوائي لضمان كلمة جديدة: ${randomSeed}). وأيضاً، أورد بيتاً من الشعر العربي الفصيح يحتوي على الكلمة لتبيان سياق استخدامها، واذكر اسم الشاعر.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "The Arabic word itself." },
                definition: { type: Type.STRING, description: "Detailed explanation in Arabic." },
                source: { type: Type.STRING, description: "The dictionary name (e.g., لسان العرب)." },
                root: { type: Type.STRING, description: "The 3-letter root of the word." },
                poetryContext: { type: Type.STRING, description: "A classic Arabic poetry line using the word. Empty string if not found." },
                poet: { type: Type.STRING, description: "The name of the poet. Empty string if unknown." },
              },
              required: ["word", "definition", "source", "root"],
            },
          },
        });

        const jsonStr = response.text.trim();
        const parsed: WordData = JSON.parse(jsonStr);

        const notification = new Notification(`إشعار الكلمة الجديدة: ${parsed.word}`, {
          body: parsed.definition,
        });

        notification.onclick = () => {
          window.focus();
          setHistory(prev => {
            const newHistory = [...prev, parsed];
            setCurrentIndex(newHistory.length - 1);
            return newHistory;
          });
          setSeenWords(prev => {
            const newSet = new Set([...prev, parsed.word]);
            return Array.from(newSet);
          });
        };
      } catch (err) {
        console.error("Error in background notification task:", err);
      }
    }, 12 * 60 * 60 * 1000); // 12 hours

    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  return (
    <div 
      className="min-h-screen bg-beige-100 flex flex-col items-center justify-center p-6 overflow-hidden relative"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 border-r border-b border-stone-800 rounded-br-full" />
        <div className="absolute bottom-0 right-0 w-64 h-64 border-l border-t border-stone-800 rounded-tl-full" />
      </div>

      <div className="fixed top-8 right-8 z-40 flex items-center gap-3">
        <button 
          className="bg-white/50 backdrop-blur-sm p-3 rounded-full text-stone-600 hover:text-stone-900 shadow-sm border border-white/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsSearchOpen(true);
          }}
          title="بحث عن كلمة"
        >
          <Search size={20} />
        </button>
        <button 
          className="bg-white/50 backdrop-blur-sm p-3 rounded-full text-stone-600 hover:text-stone-900 shadow-sm border border-white/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsBookmarksOpen(true);
          }}
          title="الكلمات المحفوظة"
        >
          <Bookmark size={20} />
        </button>

      </div>

      <header className="fixed top-8 flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-stone-500 font-sans tracking-widest text-xs uppercase"
        >
          <Sparkles size={14} />
          <span>روائع اللغة العربية</span>
        </motion.div>
        <h1 className="font-serif text-2xl text-stone-800 opacity-80">بيان</h1>
      </header>

      <main className="max-w-xl w-full text-center arabic-text">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-16"
            >
              <RefreshCw className="animate-spin text-beige-400" size={48} />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-800 bg-red-50 p-4 rounded-xl border border-red-100"
            >
              {error}
            </motion.div>
          ) : wordData && (
            <motion.article
              key={wordData.word}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset }) => {
                const swipe = offset.x;
                if (swipe < -80 && !loading) {
                  // Swiped left
                  if (currentIndex < history.length - 1) handleNext();
                  else handleNewWord();
                } else if (swipe > 80 && !loading && currentIndex > 0) {
                  // Swiped right
                  handlePrevious();
                }
              }}
              className="relative py-12 px-8 bg-white/40 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl shadow-stone-200/50 cursor-default touch-pan-y"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!wordData) return;
                    let shareText = `تعرّف على كلمة "${wordData.word}" من تطبيق بيان:\n\nالمعنى: ${wordData.definition}\nالجذر: ${wordData.root}\nالمصدر: ${wordData.source}`;
                    if (wordData.poetryContext) {
                        shareText += `\n\nشاهد: ${wordData.poetryContext}`;
                        if (wordData.poet) shareText += ` (${wordData.poet})`;
                    }
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: `كلمة: ${wordData.word}`,
                          text: shareText,
                        });
                      } else {
                        await navigator.clipboard.writeText(shareText);
                        alert("تم نسخ النص إلى الحافظة!");
                      }
                    } catch (err) {
                      console.error("Error sharing:", err);
                    }
                  }}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                  title="مشاركة الكلمة"
                >
                  <Share2 size={24} />
                </button>
                <button
                  onClick={toggleBookmark}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                  title={isBookmarked ? "إزالة من المحفوظات" : "حفظ الكلمة"}
                >
                  {isBookmarked ? (
                    <BookmarkCheck size={28} className="text-stone-700 fill-current" />
                  ) : (
                    <BookmarkPlus size={28} />
                  )}
                </button>
              </div>

              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-stone-800 text-white text-[10px] rounded-full font-sans uppercase tracking-[0.2em]">
                جذر: {wordData.root}
              </div>

              <h2 className="font-serif text-7xl md:text-8xl text-stone-900 mb-8 leading-tight">
                {wordData.word}
              </h2>

              <div className="space-y-6">
                <div className="h-px w-24 bg-stone-300 mx-auto" />
                
                <p className="font-sans text-lg md:text-xl text-stone-700 leading-relaxed max-h-[35vh] overflow-y-auto px-2 custom-scrollbar">
                  {wordData.definition}
                </p>

                {wordData.poetryContext && (
                  <div className="mt-8 pt-6 border-t border-stone-200/60">
                    <p className="font-serif text-xl text-stone-700 leading-loose text-center" dir="rtl">
                      {wordData.poetryContext}
                    </p>
                    {wordData.poet && (
                      <p className="font-sans text-sm text-stone-400 mt-3 text-center" dir="rtl">
                        — {wordData.poet}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-stone-400 italic text-sm mt-8">
                  <BookOpen size={14} />
                  <span>المصدر: {wordData.source}</span>
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-8 flex z-40 w-full justify-center px-6">
        <div className="flex items-center bg-white/80 backdrop-blur-lg rounded-full shadow-xl border border-white/50 p-1.5 gap-1 shadow-stone-200/50">
          <button 
            onClick={handlePrevious} 
            disabled={currentIndex <= 0 || loading} 
            className="p-3 rounded-full text-stone-600 hover:bg-stone-100/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            title="الكلمة السابقة"
            dir="rtl"
          >
            <ChevronRight size={24} />
          </button>

          <div className="h-6 w-px bg-stone-200/80 mx-1" />

          <button 
            onClick={handleNewWord} 
            disabled={loading}
            className="px-8 py-3 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-all font-sans font-medium flex items-center gap-2 disabled:opacity-80 shadow-md"
            title="كلمة جديدة"
            dir="rtl"
          >
            <Sparkles size={18} />
            <span>جديد</span>
          </button>

          <div className="h-6 w-px bg-stone-200/80 mx-1" />

          <button 
            onClick={handleNext} 
            disabled={currentIndex >= history.length - 1 || loading} 
            className="p-3 rounded-full text-stone-600 hover:bg-stone-100/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            title="الكلمة التالية"
            dir="rtl"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      </footer>
      
      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-beige-50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative arabic-text cursor-default"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(false);
                }}
                className="absolute top-6 left-6 text-stone-400 hover:text-stone-600 transition-colors z-10"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-serif text-2xl text-stone-800 mb-6 flex items-center gap-2">
                <Search size={24} className="text-stone-600" />
                بحث عن كلمة
              </h2>

              <form onSubmit={searchSpecificWord} className="flex flex-col gap-4 relative">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="أدخل الكلمة هنا..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-sans focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
                  dir="rtl"
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="bg-stone-800 text-white rounded-xl py-3 font-sans font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  بحث
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Modal */}
      <AnimatePresence>
        {isBookmarksOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsBookmarksOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-beige-50 rounded-3xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl relative arabic-text cursor-default"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBookmarksOpen(false);
                }}
                className="absolute top-6 left-6 text-stone-400 hover:text-stone-600 transition-colors z-10"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-serif text-2xl text-stone-800 mb-6 flex items-center gap-2">
                <Bookmark size={24} className="text-stone-600" />
                الكلمات المحفوظة
              </h2>

              <div className="overflow-y-auto custom-scrollbar flex-1 pl-2 space-y-4">
                {bookmarkedWords.length === 0 ? (
                  <p className="text-stone-500 font-sans text-center py-8">لم يتم حفظ أي كلمات بعد.</p>
                ) : (
                  bookmarkedWords.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-serif text-2xl text-stone-800 font-bold">{item.word}</h3>
                         <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookmarkedWords(prev => prev.filter(w => w.word !== item.word));
                            }}
                            className="text-stone-300 hover:text-red-400 transition-colors"
                            title="إزالة"
                         >
                            <BookmarkCheck size={20} className="fill-current" />
                         </button>
                      </div>
                      <p className="font-sans text-sm text-stone-600 mb-4 leading-relaxed">{item.definition}</p>
                      {item.poetryContext && (
                         <div className="mb-4 text-center px-2">
                           <p className="font-serif text-base text-stone-700 leading-relaxed">"{item.poetryContext}"</p>
                           {item.poet && <p className="font-sans text-xs text-stone-400 mt-1.5">— {item.poet}</p>}
                         </div>
                      )}
                      <div className="flex items-center gap-2 text-stone-400 text-xs">
                        <span className="bg-stone-100 px-2 py-0.5 rounded-full text-stone-600 font-medium">جذر: {item.root}</span>
                        <span>•</span>
                        <span>{item.source}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #dfd5b5;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
