/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { UserProfile, AiCoachMessage } from "../types";
import { Sparkles, Send, Loader2, Bot, User, BrainCircuit, ArrowRight, HelpCircle } from "lucide-react";

interface AiCoachProps {
  profile: UserProfile;
}

const COACH_PROMPT_SHORTCUTS = [
  "Why is my weight up this week?",
  "Am I eating enough protein?",
  "How much weight should I lose by next month?",
  "Review my last 7 days",
];

export default function AiCoach({ profile }: AiCoachProps) {
  const [messages, setMessages] = useState<AiCoachMessage[]>([
    {
      sender: "coach",
      text: `Hello ${profile.name}! I am your Cut Tracker scientific AI Coach. I analyze your bio-metrics, body weight entries, calorie logs, and protein distribution. Ask me anything about your current progress!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Append user message
    const userMsg: AiCoachMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          query: textToSend,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "The model could not formulate a response. Make sure Ollama or Gemini is configured correctly.");
      }

      const data = await res.json();
      
      const coachMsg: AiCoachMessage = {
        sender: "coach",
        text: data.answer || "Coach had trouble formulating an response. Please check his connection settings.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, coachMsg]);
    } catch (err: any) {
      const errorMsg: AiCoachMessage = {
        sender: "coach",
        text: `Error connecting to AI Coach: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-coach-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Informative Coach profile description card - Left */}
      <div className="lg:col-span-4 p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-3.5 border-b border-zinc-850">
          <BrainCircuit className="w-5 h-5 text-emerald-500 animate-pulse" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Biometric Intellisense</h3>
        </div>

        <p className="text-[11px] text-zinc-550 leading-relaxed">
          Cut Coach operates purely on thermodynamic and thermodynamic law models. It digests active weight logs, nutritional averages, and historic deficits to produce empirical metaboloic evaluations.
        </p>

        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-xs text-zinc-400 space-y-2.5">
          <div className="text-zinc-200 font-bold uppercase tracking-wider text-[10px] mb-1 font-sans flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Empirical shortcut queries
          </div>
          {COACH_PROMPT_SHORTCUTS.map((shortcut, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(shortcut)}
              disabled={isLoading}
              className="w-full text-left bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/30 p-2.5 rounded-xl cursor-pointer transition text-[10.5px] text-zinc-350 hover:text-emerald-300 flex items-center justify-between"
            >
              <span>{shortcut}</span>
              <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0 select-none" />
            </button>
          ))}
        </div>
      </div>

      {/* Coach Chat Window Workspace - Right */}
      <div className="lg:col-span-8 bg-zinc-900/30 rounded-3xl border border-zinc-850 shadow-2xl flex flex-col h-[520px] overflow-hidden">
        {/* Chat window Header */}
        <div className="bg-zinc-905/70 border-b border-zinc-850 p-4 flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                <Bot className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
              </div>
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950 absolute bottom-0 right-0 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Biometric Coach</h4>
              <p className="text-[9px] text-zinc-550 font-mono tracking-wider uppercase">Metabolics model active</p>
            </div>
          </div>
        </div>

        {/* Message Feeds Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-950/20">
          {messages.map((m, idx) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Sender Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${
                  isUser 
                    ? "bg-indigo-500/10 border-indigo-500/20" 
                    : "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                  {isUser ? <User className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                </div>

                {/* Message bubble speech text */}
                <div className={`p-4 rounded-2xl text-xs leading-relaxed relative ${
                  isUser 
                    ? "bg-zinc-800 border border-zinc-700/50 text-zinc-100 rounded-tr-none" 
                    : "bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-tl-none shadow-md"
                }`}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className="text-[8px] text-zinc-650 font-mono block text-right mt-1.5 leading-none">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="text-xs text-zinc-500 font-mono">Calibrating therapeutic metrics...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Messaging Input Tray footer */}
        <div className="bg-zinc-950 border-t border-zinc-850 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputValue.trim()) handleSendMessage(inputValue);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Ask Coach: Why is my weight stalled? Am I eating enough protein?..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 font-sans focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-emerald-500 hover:bg-emerald-450 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 p-3 rounded-2xl cursor-pointer disabled:cursor-not-allowed transition shrink-0"
            >
              <Send className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
