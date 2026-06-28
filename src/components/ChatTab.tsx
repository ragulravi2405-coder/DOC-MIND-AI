import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Star, 
  BookOpen, 
  RotateCcw, 
  Sparkles,
  Loader2
} from "lucide-react";
import { EduDocument, ChatMessage } from "../types";

interface ChatTabProps {
  document: EduDocument | null;
  language: string;
}

// Map selected language to SpeechRecognition and SpeechSynthesis voice tags
const LANG_VOICE_MAP: Record<string, string> = {
  English: "en-US",
  Tamil: "ta-IN",
  Hindi: "hi-IN",
  Malayalam: "ml-IN",
  Telugu: "te-IN"
};

export default function ChatTab({ document, language }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Voice Input (Speech Recognition) State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef<any>(null);

  // Audio Playback / TTS State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<{ id: string; docName: string; question: string; answer: string; timestamp: string }[]>(
    JSON.parse(localStorage.getItem("edumind_bookmarks") || "[]")
  );
  const [showBookmarksTray, setShowBookmarksTray] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages list grows
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Seed greeting when document loads
  useEffect(() => {
    if (document) {
      setMessages([
        {
          id: "greeting",
          sender: "ai",
          text: `Hello! I have indexed **"${document.name}"**. I can answer any questions, explain complex chapters, or summarize paragraphs. Ask me anything! I am configured to answer *only* using information inside this document.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [document]);

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
          No Document Loaded
        </h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Please select or upload a document on your primary Dashboard first to start an AI grounded chat.
        </p>
      </div>
    );
  }

  // 1. Text to Speech (Voice Output)
  const speakText = (text: string, messageId: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setSpeechError("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (speakingMessageId === messageId) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synth.cancel(); // cancel current speaking
    const cleanText = text.replace(/[*#`_\-]/g, ""); // clean Markdown markers
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose correct voice locale
    utterance.lang = LANG_VOICE_MAP[language] || "en-US";
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    synth.speak(utterance);
  };

  // 2. Speech to Text (Voice Input)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = LANG_VOICE_MAP[language] || "en-US";

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage((prev) => (prev ? prev + " " + transcript : transcript));
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // 3. Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-API-Key": localStorage.getItem("gemini_api_key") || ""
        },
        body: JSON.stringify({
          message: userMsg.text,
          history: messages.slice(-10), // send last 10 turns as context
          documentText: document.summary + "\n" + document.revisionNotes + "\n" + document.importantTopics,
          documentSummary: document.summary,
          language: language
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMsg: ChatMessage = {
        id: "msg-" + Math.random().toString(36).substr(2, 9),
        sender: "ai",
        text: data.text || "Sorry, I had trouble parsing the document segment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: `⚠️ **Error generating response**: ${err.message || "Something went wrong."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 4. Bookmark Handler
  const toggleBookmark = (msg: ChatMessage, questionText: string) => {
    const isBookmarked = bookmarks.some(b => b.id === msg.id);
    let updated = [];
    if (isBookmarked) {
      updated = bookmarks.filter(b => b.id !== msg.id);
    } else {
      updated = [
        ...bookmarks,
        {
          id: msg.id,
          docName: document.name,
          question: questionText || "Query Topic",
          answer: msg.text,
          timestamp: new Date().toLocaleDateString()
        }
      ];
    }
    setBookmarks(updated);
    localStorage.setItem("edumind_bookmarks", JSON.stringify(updated));
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "greeting",
        sender: "ai",
        text: `Chat restarted! Ask me anything regarding **"${document.name}"**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[78vh] max-w-6xl mx-auto p-2 md:p-4 gap-4 relative">
      
      {/* Primary Chat Box */}
      <div className="flex-1 bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/10">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400">
                AI Grounded Tutor
              </p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-sm">
                Chatting about: {document.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBookmarksTray(!showBookmarksTray)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 font-semibold rounded-lg flex items-center space-x-1.5 hover:bg-slate-100 dark:hover:bg-white/10 transition"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
            <button
              onClick={handleClearChat}
              title="Clear active chat history"
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Speech Error Banner */}
        {speechError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span>{speechError}</span>
            <button 
              onClick={() => setSpeechError("")}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            
            // Try to find the preceding user message for bookmark mapping
            const queryContext = !isUser && index > 0 ? messages[index - 1]?.text : "";

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative group transition ${
                    isUser
                      ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-tr-none"
                      : "bg-slate-50 dark:bg-white/[0.02] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/10 rounded-tl-none"
                  }`}
                >
                  {/* Message content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* Micro Indicators / Actions */}
                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 border-t border-slate-200/20 pt-1.5">
                    <span>{msg.timestamp}</span>

                    {/* Speech / Star controls for AI answers */}
                    {!isUser && (
                      <div className="flex items-center space-x-2.5 opacity-0 group-hover:opacity-100 transition duration-200">
                        <button
                          onClick={() => speakText(msg.text, msg.id)}
                          title="Read answer aloud"
                          className="text-slate-400 hover:text-indigo-500 transition"
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleBookmark(msg, queryContext)}
                          title="Bookmark this answer"
                          className="text-slate-400 hover:text-amber-500 transition"
                        >
                          <Star 
                            className={`w-3.5 h-3.5 ${
                              bookmarks.some(b => b.id === msg.id) ? "text-amber-500 fill-amber-500" : ""
                            }`} 
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 dark:bg-white/[0.02] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/10 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-3">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-slate-400 font-medium font-mono">
                  DOC - MIND AI is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 dark:bg-[#0a0a0f] border-t border-slate-100 dark:border-white/10 flex items-center space-x-3">
          
          {/* Voice Input (Speech to Text) */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-xl flex items-center justify-center transition shrink-0 shadow-sm ${
              isListening
                ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                : "bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
            title={isListening ? "Listening... click to stop" : "Speak your query"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Typing Area */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isListening ? "Listening aloud..." : "Ask your grounded document question..."}
            className="flex-1 bg-white dark:bg-white/[0.02] text-sm rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 focus:outline-none focus:border-cyan-400 dark:text-slate-100"
          />

          {/* Send Trigger */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 disabled:text-white rounded-xl shadow-md disabled:opacity-50 transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Bookmarked Answers Slide-out Sidebar */}
      {showBookmarksTray && (
        <div className="w-full lg:w-80 bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 shadow-lg p-5 flex flex-col absolute lg:static top-0 right-0 h-full z-10">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-2" />
              Bookmarked Study Topics
            </h4>
            <button
              onClick={() => setShowBookmarksTray(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {bookmarks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No bookmarked answers yet. Hover over AI tutor responses and click the star icon to save!
              </div>
            ) : (
              bookmarks.map((b) => (
                <div key={b.id} className="bg-slate-50 dark:bg-white/[0.01] rounded-xl p-3.5 border border-slate-100 dark:border-white/10 text-xs space-y-2 relative group">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold truncate max-w-[150px]">{b.docName}</span>
                    <span>{b.timestamp}</span>
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Q: {b.question}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {b.answer}
                  </p>
                  <button
                    onClick={() => {
                      const updated = bookmarks.filter(item => item.id !== b.id);
                      setBookmarks(updated);
                      localStorage.setItem("edumind_bookmarks", JSON.stringify(updated));
                    }}
                    className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition text-[10px] font-mono"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
