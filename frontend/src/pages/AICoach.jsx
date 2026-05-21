import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RotateCcw, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  BrainCircuit,
  MessageSquareDot,
  TrendingUp,
  Activity,
  Flame,
  LayoutGrid
} from 'lucide-react';

// Custom Markdown Formatter Component
const formatMarkdown = (text) => {
  if (!text) return '';
  
  const lines = text.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;
  
  const parseInline = (str) => {
    const parts = str.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-zinc-900 dark:text-white">{part}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Table parsing
    if (line.startsWith('|')) {
      inTable = true;
      if (line.includes(':---') || line.includes('---:')) {
        continue;
      }
      const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cols);
      continue;
    } else {
      if (inTable && tableRows.length > 0) {
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(1);
        
        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto border border-border-light/60 dark:border-border-dark/60 rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-border-light/60 dark:divide-border-dark/60 text-[11px] leading-tight">
              <thead className="bg-zinc-55 dark:bg-zinc-800/60">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50 dark:divide-border-dark/50 bg-white/50 dark:bg-bg-card-dark/30">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-brand-purple/5 dark:hover:bg-brand-purple/5 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-zinc-600 dark:text-zinc-350">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    }

    if (line === '') continue;

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-bold text-zinc-900 dark:text-white mt-4 mb-2 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800/60 pb-1">
          {parseInline(line.substring(4))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-zinc-900 dark:text-white mt-5 mb-2.5">
          {parseInline(line.substring(3))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-base font-bold text-zinc-900 dark:text-white mt-6 mb-3">
          {parseInline(line.substring(2))}
        </h1>
      );
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-3.5 list-disc text-xs text-zinc-650 dark:text-zinc-300 mb-1 leading-relaxed">
          {parseInline(line.substring(2))}
        </li>
      );
    } else {
      elements.push(
        <p key={i} className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed mb-2.5">
          {parseInline(line)}
        </p>
      );
    }
  }

  if (inTable && tableRows.length > 0) {
    const headers = tableRows[0];
    const bodyRows = tableRows.slice(1);
    elements.push(
      <div key="table-end" className="my-3 overflow-x-auto border border-border-light/60 dark:border-border-dark/60 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-border-light/60 dark:divide-border-dark/60 text-[11px] leading-tight">
          <thead className="bg-zinc-55 dark:bg-zinc-800/60">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                  {parseInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/50 dark:divide-border-dark/50 bg-white/50 dark:bg-bg-card-dark/30">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-brand-purple/5 dark:hover:bg-brand-purple/5 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-zinc-650 dark:text-zinc-350">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

// 3D Rotating Brand Monogram Logo with cyber scopes
export const DX3DLogo = ({ isThinking }) => {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Smooth responsive tilt multiplier
    const rx = -(y / (rect.height / 2)) * 25;
    const ry = (x / (rect.width / 2)) * 25;
    
    containerRef.current.style.setProperty('--rx', `${rx}deg`);
    containerRef.current.style.setProperty('--ry', `${ry}deg`);
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    containerRef.current.style.setProperty('--rx', '0deg');
    containerRef.current.style.setProperty('--ry', '0deg');
  };

  return (
    <div 
      className="relative w-48 h-48 flex items-center justify-center select-none perspective-1000 cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Cyber scope rings around logo */}
      <div className="absolute w-40 h-40 border border-dashed border-brand-purple/20 dark:border-brand-purple/30 rounded-full animate-spin-slow pointer-events-none transform rotate-x-70 translate-z-[-15px]" />
      <div className="absolute w-32 h-32 border border-brand-blue/30 dark:border-brand-blue/40 rounded-full animate-spin-reverse pointer-events-none transform rotate-x-70 translate-z-[-5px]" />
      
      {/* 3D Scene Wrapper */}
      <div 
        ref={containerRef}
        className={`w-32 h-32 relative transform-style-preserve-3d transition-transform duration-300 logo-container ${
          isThinking ? 'animate-thinking' : 'animate-floating'
        }`}
      >
        {/* Ambient shadow plane */}
        <div className={`absolute inset-0 bg-brand-purple/20 dark:bg-brand-purple/35 rounded-full filter blur-xl transform translate-z-[-45px] rotate-x-75 scale-90 ${
          isThinking ? 'animate-shadow-thinking' : 'animate-shadow'
        }`} />
        
        {/* Ultra-glassmorphic base backplate */}
        <div className="absolute inset-0 rounded-2xl bg-white/20 dark:bg-zinc-800/10 border-2 border-white/20 dark:border-zinc-700/30 backdrop-blur-md transform translate-z-[-20px] shadow-[0_0_20px_rgba(26,115,232,0.15)] dark:shadow-[0_0_35px_rgba(26,115,232,0.25)]" />

        {/* 3D Extrusion Stacking layers (6 layers of SVG) */}
        <div className="absolute inset-0 flex items-center justify-center transform-style-preserve-3d">
          {[...Array(6)].map((_, i) => (
            <svg
              key={i}
              className="absolute w-20 h-20 transition-all duration-300"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: `translateZ(${i * 3}px)`,
                color: i === 5 
                  ? '#1a73e8' // Front face: Bright brand blue
                  : i === 4
                  ? '#2b84f9' // Inner glow layer
                  : i > 1
                  ? '#1557b0' // Mid layers
                  : '#0d3c80', // Bottom layers
                filter: i === 5 ? 'drop-shadow(0 0 12px rgba(26, 115, 232, 0.75))' : 'none',
                opacity: 0.98 - (5 - i) * 0.04
              }}
            >
              <path 
                d="M25 25H50C62 25 70 32 70 45C70 58 62 65 50 65H25V25Z" 
                stroke="currentColor" 
                strokeWidth="10" 
                strokeLinejoin="round" 
              />
              <path 
                d="M70 25L35 65" 
                stroke={i === 5 ? '#a855f7' : 'currentColor'} // Purple cross-slash
                strokeWidth="12" 
                strokeLinecap="round" 
              />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
};

// Inline interactive productivity widgets with rich custom SVG gauges
const CoachWidget = ({ data }) => {
  if (!data) return null;

  switch (data.type) {
    case 'performance_summary':
      // Calculate dashboard stroke calculations
      const radius = 24;
      const stroke = 6;
      const normalizedRadius = radius - stroke * 2;
      const circumference = normalizedRadius * 2 * Math.PI;
      const strokeDashoffset = circumference - (data.score / 100) * circumference;

      return (
        <div className="mt-3 p-4 border border-border-light/60 dark:border-border-dark/60 bg-gradient-to-br from-zinc-50/80 to-white/90 dark:from-zinc-900/40 dark:to-zinc-900/10 rounded-xl max-w-sm shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-brand-purple" />
              Cognitive Diagnostic
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Aggregated
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Score Ring Gauge */}
            <div className="bg-white dark:bg-bg-card-dark p-3 border border-border-light/60 dark:border-border-dark/60 rounded-xl flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    stroke="rgba(26,115,232,0.1)"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius + 8}
                    cy={radius + 8}
                  />
                  <circle
                    stroke="#1a73e8"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius + 8}
                    cy={radius + 8}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-xs font-bold text-zinc-800 dark:text-white">{data.score}%</div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-2 uppercase tracking-wide">Productivity Score</span>
            </div>

            <div className="bg-white dark:bg-bg-card-dark p-3 border border-border-light/60 dark:border-border-dark/60 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-full flex items-center justify-center text-brand-purple mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{data.hours}h</div>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">Focused Hours</span>
            </div>

            <div className="col-span-2 bg-white dark:bg-bg-card-dark p-3 border border-border-light/60 dark:border-border-dark/60 rounded-xl flex items-center justify-between hover:border-brand-purple/40 transition-colors">
              <div>
                <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Optimal Work Window</div>
                <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
                  {data.peakEra}
                </div>
              </div>
              <Zap className="w-5 h-5 text-brand-amber animate-pulse" />
            </div>

            <div className="col-span-2 bg-gradient-to-r from-brand-red/5 to-transparent border border-brand-red/20 dark:border-brand-red/30 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold text-brand-red uppercase tracking-wide">Neglected Routine Bottleneck</div>
                <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {data.lowestCat} category <span className="text-brand-red">({data.lowestRatio}% completed)</span>
                </div>
              </div>
              <AlertCircle className="w-5 h-5 text-brand-red" />
            </div>
          </div>
        </div>
      );

    case 'streak_analyzer':
      return (
        <div className="mt-3 p-4 border border-border-light/60 dark:border-border-dark/60 bg-gradient-to-br from-zinc-50/80 to-white/90 dark:from-zinc-900/40 dark:to-zinc-900/10 rounded-xl max-w-sm shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-3.5 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-brand-amber animate-bounce" />
              Streak Diagnostic
            </span>
            <span className="text-[9px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">Consistency Matrix</span>
          </div>
          
          <div className="space-y-3">
            {/* Visual ratio bar */}
            <div className="bg-white dark:bg-bg-card-dark p-3 border border-border-light/60 dark:border-border-dark/60 rounded-xl">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                <span>Routine Success ratio</span>
                <span className="text-zinc-800 dark:text-zinc-200">{Math.round((data.completed / (data.completed + data.missed || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-brand-green h-full" style={{ width: `${(data.completed / (data.completed + data.missed || 1)) * 100}%` }} title="Completed" />
                <div className="bg-brand-red h-full" style={{ width: `${(data.missed / (data.completed + data.missed || 1)) * 100}%` }} title="Missed" />
              </div>
              <div className="flex gap-4 mt-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded bg-brand-green" />
                  {data.completed} Done
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded bg-brand-red" />
                  {data.missed} Missed
                </div>
              </div>
            </div>

            <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/20 p-3 rounded-xl">
              <div className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">Defensive Strategy Recommendation:</div>
              <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-brand-purple animate-pulse" />
                Secure upcoming routines in <span className="underline decoration-brand-purple decoration-2">{data.bottleneck || 'Routine'}</span>!
              </div>
            </div>
          </div>
        </div>
      );

    case 'schedule_suggestion':
      return (
        <div className="mt-3 p-4 border border-border-light/60 dark:border-border-dark/60 bg-gradient-to-br from-zinc-50/80 to-white/90 dark:from-zinc-900/40 dark:to-zinc-900/10 rounded-xl max-w-sm shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-brand-purple" />
              Structured Suggestion
            </span>
            <span className="text-[9px] text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full font-bold">Peak: {data.peakEra}</span>
          </div>

          <div className="space-y-2.5">
            <div className="bg-white dark:bg-bg-card-dark p-3 border border-border-light/60 dark:border-border-dark/60 rounded-xl flex items-center justify-between hover:border-brand-purple/35 transition-colors">
              <div>
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Primary Kickoff Block</span>
                <span className="text-xs font-extrabold text-zinc-800 dark:text-white block mt-0.5">{data.suggestedStart}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Recommended Category</span>
                <span className="text-xs font-extrabold text-brand-purple block mt-0.5">{data.priorityCat || 'Routine'}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic text-center font-medium">Use the "Routine Designer" tab to apply this high-focus time sequence.</p>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const AICoach = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Initial welcome message
  useEffect(() => {
    const welcome = {
      id: 'welcome',
      sender: 'ai',
      text: `Hello **${user?.name || 'Champ'}**! I am your **DisciplineX AI Agent**, trained directly on your routine analytics, streaks, and focus metrics. 

Ask me anything about your productivity! You can try asking:
* *"Analyze my routines"* for a full performance diagnostic.
* *"How do I improve my streak?"* to learn consistency strategies.
* *"Suggest a perfect schedule"* to get a customized time-blocked routine template.`,
      timestamp: new Date()
    };
    setMessages([welcome]);
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle consultation form submission
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);
    setError('');

    try {
      const response = await api.post('/ai/consult', { message: text });
      
      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        widgetData: response.widgetData,
        modelName: response.modelName,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err.message || 'AI Core failed to respond.');
      const errorMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **API error:** ${err.message || 'AI Core failed to connect. Make sure your local backend dev server is active and accessible on Port 5000.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleChipClick = (promptText) => {
    if (isThinking) return;
    handleSendMessage(promptText);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      
      {/* Scope-restricted dynamic CSS for the premium 3D logo core, drifting auroras, and scopes */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .logo-container {
          transform: perspective(1000px) rotateX(calc(22deg + var(--rx, 0deg))) rotateY(calc(-15deg + var(--ry, 0deg))) translateZ(0);
          transform-style: preserve-3d;
          transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @keyframes float3D {
          0%, 100% {
            transform: perspective(1000px) rotateX(22deg) rotateY(-15deg) rotateZ(0deg) translateY(0px) rotateX(calc(var(--rx, 0deg))) rotateY(calc(var(--ry, 0deg)));
          }
          50% {
            transform: perspective(1000px) rotateX(25deg) rotateY(-11deg) rotateZ(2deg) translateY(-14px) rotateX(calc(var(--rx, 0deg))) rotateY(calc(var(--ry, 0deg)));
          }
        }
        @keyframes spinActive3D {
          0% {
            transform: perspective(1000px) rotateX(24deg) rotateY(-12deg) rotateZ(0deg) scale(1.05) rotateX(calc(var(--rx, 0deg))) rotateY(calc(var(--ry, 0deg)));
          }
          100% {
            transform: perspective(1000px) rotateX(24deg) rotateY(-12deg) rotateZ(360deg) scale(1.05) rotateX(calc(var(--rx, 0deg))) rotateY(calc(var(--ry, 0deg)));
          }
        }
        @keyframes shadowPulse3D {
          0%, 100% {
            transform: translateZ(-45px) rotateX(75deg) rotateZ(45deg) scale(0.95);
            opacity: 0.35;
          }
          50% {
            transform: translateZ(-45px) rotateX(75deg) rotateZ(45deg) scale(0.75);
            opacity: 0.7;
          }
        }
        @keyframes spinSlow {
          0% { transform: rotateX(70deg) rotateY(-10deg) rotate(0deg); }
          100% { transform: rotateX(70deg) rotateY(-10deg) rotate(360deg); }
        }
        @keyframes spinReverse {
          0% { transform: rotateX(70deg) rotateY(-10deg) rotate(360deg); }
          100% { transform: rotateX(70deg) rotateY(-10deg) rotate(0deg); }
        }
        @keyframes auroraDrift1 {
          0%, 100% { transform: translate(-30px, -20px) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.3); }
        }
        @keyframes auroraDrift2 {
          0%, 100% { transform: translate(40px, 40px) scale(1.2); }
          50% { transform: translate(-20px, -40px) scale(0.85); }
        }
        @keyframes messageSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-floating {
          animation: float3D 6s ease-in-out infinite;
        }
        .animate-thinking {
          animation: spinActive3D 2.5s linear infinite;
        }
        .animate-shadow {
          animation: shadowPulse3D 6s ease-in-out infinite;
        }
        .animate-shadow-thinking {
          animation: shadowPulse3D 2.5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spinSlow 15s linear infinite;
        }
        .animate-spin-reverse {
          animation: spinReverse 10s linear infinite;
        }
        .animate-aurora-1 {
          animation: auroraDrift1 14s ease-in-out infinite;
        }
        .animate-aurora-2 {
          animation: auroraDrift2 18s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: messageSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Grid Layout: Left visual core & Right conversational panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: 3D Hologram Brain Core Card with Cyber Grid Pattern & Auroras */}
        <div className="md:col-span-4 bg-white/70 dark:bg-bg-card-dark/45 border border-border-light/60 dark:border-border-dark/60 rounded-2xl p-6 flex flex-col items-center justify-between gap-6 card-shadow backdrop-blur-xl relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px]">
          
          {/* Drifting glow elements */}
          <div className="absolute w-44 h-44 rounded-full bg-brand-purple/15 dark:bg-brand-purple/20 filter blur-3xl -top-10 -left-10 animate-aurora-1 pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full bg-brand-blue/15 dark:bg-brand-blue/20 filter blur-3xl -bottom-10 -right-10 animate-aurora-2 pointer-events-none" />

          {/* Heading */}
          <div className="w-full text-center md:text-left z-10">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-brand-purple bg-brand-purple/10 border border-brand-purple/20 px-2.5 py-0.5 rounded-full mb-2">
              <BrainCircuit className="w-3.5 h-3.5" />
              Cognitive Engine
            </span>
            <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight">
              DisciplineX AI Agent
            </h2>
            <p className="text-[11px] text-zinc-550 dark:text-zinc-450 mt-1">
              Analyzing local schedule datasets in real-time.
            </p>
          </div>

          {/* Glowing 3D Monogram Core Viewport */}
          <div className="flex-grow flex items-center justify-center py-4 z-10">
            <DX3DLogo isThinking={isThinking} />
          </div>

          {/* System Spec badging */}
          <div className="w-full space-y-2 border-t border-border-light/60 dark:border-border-dark/60 pt-4 z-10">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Engine Status</span>
              <span className="flex items-center gap-1.5 text-brand-green font-bold">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-ping" />
                {isThinking ? 'Processing...' : 'Active / Ready'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Model Version</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                Cognitive v1.4
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Local Sync</span>
              <span className="text-zinc-700 dark:text-zinc-350 font-bold text-brand-purple">Enabled (100% Offline)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Conversation Console */}
        <div className="md:col-span-8 bg-white/70 dark:bg-bg-card-dark/45 border border-border-light/60 dark:border-border-dark/60 rounded-2xl flex flex-col h-[560px] md:h-[590px] card-shadow backdrop-blur-xl overflow-hidden relative">
          
          {/* Header */}
          <div className="border-b border-border-light/60 dark:border-border-dark/60 px-4 py-3 bg-zinc-50/60 dark:bg-zinc-800/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple border border-brand-purple/20 shadow-inner">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white leading-tight">Coach Consultation</h3>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wide block">Contextual routine diagnostics</span>
              </div>
            </div>
            <button 
              onClick={() => {
                if (isThinking) return;
                const welcome = {
                  id: 'welcome',
                  sender: 'ai',
                  text: `Hello **${user?.name || 'Champ'}**! I am your **DisciplineX AI Agent**, trained directly on your routine analytics, streaks, and focus metrics. 

Ask me anything about your productivity! You can try asking:
* *"Analyze my routines"* for a full performance diagnostic.
* *"How do I improve my streak?"* to learn consistency strategies.
* *"Suggest a perfect schedule"* to get a customized time-blocked routine template.`,
                  timestamp: new Date()
                };
                setMessages([welcome]);
              }}
              title="Reset Conversation"
              className="p-1.5 border border-border-light/60 dark:border-border-dark/60 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800/50 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversation Timeline */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[85%] md:max-w-[80%] animate-slide-up ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 select-none border transition-transform hover:scale-105 ${
                  msg.sender === 'user'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-border-light/60 dark:border-border-dark/60 shadow-sm'
                    : 'bg-brand-purple/10 dark:bg-brand-purple/20 text-brand-purple border-brand-purple/20 shadow-[0_0_10px_rgba(26,115,232,0.1)]'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div>
                  <div className={`p-3.5 rounded-2xl border ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-brand-blue to-indigo-600 text-white border-transparent text-xs leading-relaxed font-medium shadow-md shadow-brand-blue/10 rounded-tr-sm'
                      : 'bg-white/80 dark:bg-zinc-900/60 text-xs border-border-light/50 dark:border-border-dark/50 shadow-sm rounded-tl-sm border-l-4 border-l-brand-purple/70'
                  }`}>
                    {/* Render Text */}
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      formatMarkdown(msg.text)
                    )}

                    {/* Meta model footer for AI replies */}
                    {msg.sender === 'ai' && msg.modelName && (
                      <div className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold border-t border-border-light/30 dark:border-border-dark/30 pt-2 mt-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquareDot className="w-3.5 h-3.5 text-brand-purple" />
                        {msg.modelName}
                      </div>
                    )}
                  </div>

                  {/* Render Widgets if available */}
                  {msg.sender === 'ai' && msg.widgetData && (
                    <CoachWidget data={msg.widgetData} />
                  )}
                </div>
              </div>
            ))}

            {/* AI Core Processing Status Bubble */}
            {isThinking && (
              <div className="flex gap-3 max-w-[80%] animate-slide-up">
                <div className="w-8 h-8 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 text-brand-purple border border-brand-purple/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 bg-white/70 dark:bg-zinc-900/60 border border-border-light/50 dark:border-border-dark/50 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border-l-4 border-l-brand-purple/40">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">AI Coach is analyzing performance...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Suggestion Chips Panel */}
          <div className="px-4 py-2.5 border-t border-border-light/60 dark:border-border-dark/60 bg-zinc-50/50 dark:bg-zinc-800/10 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
            {[
              { label: '📊 Analyze Routines', prompt: 'Analyze my routines' },
              { label: '⚡ Review Consistency', prompt: 'How do I improve my streak?' },
              { label: '📅 Suggest Schedule', prompt: 'Suggest a high-performance schedule' },
              { label: '💼 Analyze Work', prompt: 'Analyze my performance in Work category' },
              { label: '❤️ Health Review', prompt: 'Analyze my performance in Health category' }
            ].map((chip, idx) => (
              <button
                key={idx}
                disabled={isThinking}
                onClick={() => handleChipClick(chip.prompt)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 border border-border-light/60 dark:border-border-dark/60 text-[10px] font-extrabold rounded-full bg-white dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple/5 transition active:scale-95 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Sparkles className="w-3 h-3 text-brand-purple" />
                {chip.label}
              </button>
            ))}
          </div>

          {/* Consultation Input field */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border-light/60 dark:border-border-dark/60 bg-white/50 dark:bg-bg-card-dark/20 flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isThinking}
              placeholder="Ask your AI coach (e.g., 'Suggest a morning schedule' or 'How is my consistency?')..."
              className="flex-grow bg-zinc-50/50 dark:bg-zinc-900/60 border border-border-light/50 dark:border-border-dark/50 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isThinking || !inputValue.trim()}
              className="bg-brand-purple text-white p-2.5 rounded-xl hover:bg-brand-purple/95 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center h-10 w-10 flex-shrink-0 shadow-md shadow-brand-purple/15"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};

export default AICoach;
