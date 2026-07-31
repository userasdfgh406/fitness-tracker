/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { UserProfile, FoodLog } from "../types";
import { Plus, Sparkles, Trash2, Calendar, Loader2, RefreshCw, AlertCircle, Check, Mic, Camera, Upload, Image, X, Square } from "lucide-react";

interface FoodDiaryProps {
  profile: UserProfile;
  foodLogs: FoodLog[];
  onAddFood: (log: Omit<FoodLog, "id">) => Promise<void>;
  onDeleteFood: (id: number) => Promise<void>;
}

export default function FoodDiary({ profile, foodLogs, onAddFood, onDeleteFood }: FoodDiaryProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Tab control
  const [activeInputTab, setActiveInputTab] = useState<"text" | "photo">("text");

  // Natural language state
  const [prompt, setPrompt] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Editable parsed values state
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");
  const [confidence, setConfidence] = useState<number>(1.0);
  const [showReviewStep, setShowReviewStep] = useState(false);

  // Voice recognition support
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Photo uploads / Camera preview handlers
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setSpeechSupported(true);
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleToggleVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (isRecording) {
      const rec = (window as any)._recInstance;
      if (rec) {
        rec.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        setParseError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setPrompt(prev => prev ? prev + " " + transcript : transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setParseError("Microphone access was denied. Make sure frame microphone/camera permissions are allowed.");
        } else {
          setParseError(`Voice dictation issue: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      (window as any)._recInstance = rec;
      rec.start();
    } catch (e: any) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setParseError(null);
    };
    reader.onerror = () => {
      setParseError("Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setShowCamera(true);
    setParseError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setParseError("Webcam/camera could not be started. Check sandbox frame permissions or upload an image file instead.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSelectedImage(dataUrl);
        stopCamera();
      }
    } catch (err: any) {
      console.error("Snap photo error:", err);
      setParseError("Failed to snap photo from webcam frame.");
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzingImage(true);
    setParseError(null);
    try {
      const res = await fetch("/api/foods/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Server failed to process food photo.");
      }

      const data = await res.json();
      setMealName(data.description || "Identified Dish");
      setCalories(data.calories);
      setProtein(data.protein);
      setCarbs(data.carbs);
      setFat(data.fat);
      setConfidence(data.confidence || 0.85);
      setShowReviewStep(true);
      
      // Clear image preview on success
      setSelectedImage(null);
    } catch (err: any) {
      setParseError(err.message || "Failed to analyze food photo via Gemini.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Hard logs for selected date
  const todaysLogs = foodLogs.filter(f => f.date === selectedDate);
  const totalCaloriesToday = todaysLogs.reduce((acc, f) => acc + f.calories, 0);
  const totalProteinToday = todaysLogs.reduce((acc, f) => acc + f.protein, 0);
  
  const calRemaining = profile.calorieTarget - totalCaloriesToday;
  const proteinRemaining = profile.proteinTarget - totalProteinToday;

  // Perform natural language parse
  const handleParseText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/foods/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: prompt }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Server failed to process query.");
      }

      const data = await res.json();
      setMealName(prompt);
      setCalories(data.calories);
      setProtein(data.protein);
      setCarbs(data.carbs);
      setFat(data.fat);
      setConfidence(data.confidence || 0.8);
      setShowReviewStep(true);
    } catch (err: any) {
      setParseError(err.message || "Failed to contact parser. You can log manually instead.");
      // Auto-initialize standard manual logging values in case of parse error
      setMealName(prompt);
      setCalories(250);
      setProtein(15);
      setCarbs(25);
      setFat(8);
      setConfidence(0.5);
      setShowReviewStep(true);
    } finally {
      setIsParsing(false);
    }
  };

  // Log food to backend
  const handleSaveMeal = async () => {
    if (!mealName.trim() || calories === "") return;

    try {
      await onAddFood({
        userId: profile.id,
        date: selectedDate,
        description: mealName,
        calories: Number(calories),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
        confidence: confidence,
      });

      // Reset
      setPrompt("");
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setConfidence(1.0);
      setShowReviewStep(false);
      setParseError(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Color Coding Rules
  // Calorie colors: Green = on track / under target, Red = over target
  let calorieColorClass = "text-emerald-400";
  let calorieBgClass = "bg-emerald-500/10 border-emerald-500/20";
  if (totalCaloriesToday > profile.calorieTarget) {
    calorieColorClass = "text-red-400";
    calorieBgClass = "bg-red-500/10 border-red-500/20";
  } else if (totalCaloriesToday > profile.calorieTarget * 0.9) {
    calorieColorClass = "text-yellow-400";
    calorieBgClass = "bg-yellow-500/10 border-yellow-500/20";
  }

  // Protein colors: Green = met goal, Yellow/Blue = progressing
  let proteinColorClass = "text-blue-400";
  let proteinBgClass = "bg-blue-500/10 border-blue-500/20";
  if (totalProteinToday >= profile.proteinTarget) {
    proteinColorClass = "text-emerald-400";
    proteinBgClass = "bg-emerald-500/10 border-emerald-500/20";
  }

  return (
    <div id="food-diary-container" className="space-y-6 animate-fade-in">
      {/* Date Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500 animate-pulse" />
          <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Diet Log Calibration Calendar</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Active Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              // reset active parse sheets
              setShowReviewStep(false);
            }}
            className="bg-zinc-950 border border-zinc-805 rounded-xl px-3 py-2 text-xs font-mono text-zinc-250 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Daily Target Progress Summary Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calorie check */}
        <div className={`p-5 rounded-3xl border ${calorieBgClass} transition-colors flex justify-between items-center`}>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Daily Calorie Balance</div>
            <div className="text-xl font-mono font-bold mt-1">
              {totalCaloriesToday} <span className="text-xs text-zinc-650">/ {profile.calorieTarget} kcal</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {calRemaining >= 0 
                ? `${calRemaining} kcal remaining today` 
                : `${Math.abs(calRemaining)} kcal excess balance`}
            </p>
          </div>
          <div className={`text-[9px] uppercase font-mono px-3 py-1.5 rounded-full border ${
            totalCaloriesToday > profile.calorieTarget ? "bg-red-950/20 border-red-500/30 text-red-400" : "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
          }`}>
            {totalCaloriesToday > profile.calorieTarget ? "OVER LIMIT" : "ON TARGET"}
          </div>
        </div>

        {/* Protein check */}
        <div className={`p-5 rounded-3xl border ${proteinBgClass} transition-colors flex justify-between items-center`}>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Nitrogen Balance average</div>
            <div className="text-xl font-mono font-bold mt-1">
              {totalProteinToday}g <span className="text-xs text-zinc-650">/ {profile.proteinTarget}g</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {proteinRemaining > 0 
                ? `${proteinRemaining}g remaining to target` 
                : "PROTEIN SATURATED 🎉"}
            </p>
          </div>
          <div className="text-[9px] uppercase font-mono px-3 py-1.5 rounded-full bg-indigo-950/20 border-indigo-500/30 text-indigo-400">
            {totalProteinToday >= profile.proteinTarget ? "SATISFIED" : "CALIBRATING"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Log Input Column - Left */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-emerald-400 fill-emerald-500/20 animate-pulse" />
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Natural Calibration AI</h3>
              </div>
            </div>

            {/* Input Method Navigation Tabs */}
            <div className="flex border-b border-zinc-800 mb-5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest gap-2">
              <button
                type="button"
                onClick={() => { setActiveInputTab("text"); setParseError(null); }}
                className={`py-2 px-3 border-b-2 cursor-pointer transition ${
                  activeInputTab === "text"
                    ? "border-emerald-500 text-emerald-400 font-extrabold"
                    : "border-transparent hover:text-zinc-300"
                }`}
              >
                Text & Voice
              </button>
              <button
                type="button"
                onClick={() => { setActiveInputTab("photo"); setParseError(null); }}
                className={`py-2 px-3 border-b-2 cursor-pointer transition ${
                  activeInputTab === "photo"
                    ? "border-emerald-500 text-emerald-400 font-extrabold"
                    : "border-transparent hover:text-zinc-300"
                }`}
              >
                Photo Analyzer
              </button>
            </div>

            {activeInputTab === "text" ? (
              <form onSubmit={handleParseText} className="space-y-4 animate-fade-in">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Describe meals in plain English, or use <span className="text-emerald-400 font-bold">Voice typing</span> below to dictate your food list.
                </p>

                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. 150g grilled chicken, half cup jasmine rice and steamed broccoli"
                    rows={3}
                    disabled={isParsing}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs p-4 pr-12 rounded-2xl focus:outline-none focus:border-emerald-500/80 resize-none font-sans placeholder-zinc-700 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`absolute right-3.5 bottom-3.5 p-2 rounded-xl border cursor-pointer transition ${
                        isRecording
                          ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30"
                      }`}
                      title={isRecording ? "Stop voice transcription" : "Type with voice"}
                    >
                      {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isRecording && (
                  <div className="text-[10px] text-red-450 font-mono flex items-center gap-1.5 animate-pulse bg-red-950/10 p-2.5 rounded-xl border border-red-900/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    MICROPHONE TRANSCRIBING COMMENCED... Speak clearly now.
                  </div>
                )}

                {parseError && (
                  <div className="text-xs bg-red-950/40 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-red-350 font-mono">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isParsing || !prompt.trim()}
                  className="w-full cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 text-[10px] uppercase tracking-widest py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      DECODING LOG WITH AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950/20" />
                      Decode Food & Macros
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Take a photo using your camera or import a food image to have Gemini extract caloric and macro nutrients automatically.
                </p>

                {showCamera ? (
                  <div className="space-y-3">
                    <div className="relative border border-zinc-800 rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center animate-fade-in">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="w-2/3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[10px] uppercase tracking-widest py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-zinc-950" />
                        Snap Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="w-1/3 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-[10px] uppercase tracking-widest py-3 rounded-xl font-bold transition border border-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedImage ? (
                  <div className="space-y-3">
                    <div className="relative border border-zinc-800 rounded-2xl overflow-hidden aspect-video bg-zinc-950 select-none animate-fade-in">
                      <img
                        src={selectedImage}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-950/55 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {parseError && (
                      <div className="text-xs bg-red-950/40 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-red-350 font-mono">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{parseError}</span>
                      </div>
                    )}

                    <div className="flex gap-2 font-sans">
                      <button
                        type="button"
                        disabled={isAnalyzingImage}
                        onClick={handleAnalyzeImage}
                        className="w-2/3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 text-[10px] uppercase tracking-widest py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        {isAnalyzingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                            ANALYZING IMAGE...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950/20" />
                            Estimate with Gemini
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="w-1/3 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-[10px] uppercase tracking-widest py-3.5 rounded-xl font-bold transition border border-zinc-800 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                    {/* Live Camera button */}
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition text-zinc-400 hover:text-emerald-400 text-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-6 h-6 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider">Live Camera</div>
                        <div className="text-[9px] text-zinc-600 font-medium">Snap food with webcam</div>
                      </div>
                    </button>

                    {/* Standard File Upload */}
                    <label
                      htmlFor="photo-upload-input"
                      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition text-zinc-400 hover:text-emerald-400 text-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-6 h-6 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider">Import Photo</div>
                        <div className="text-[9px] text-zinc-600 font-medium">Device files & camera roll</div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        id="photo-upload-input"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}

                {parseError && !selectedImage && (
                  <div className="text-xs bg-red-950/40 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-red-350 font-mono">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Review or Quick Manual Entry Step */}
          {showReviewStep && (
            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-300">Verify calibration values</h4>
                <span className="text-[9px] font-mono bg-zinc-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  CONFIDENCE: {Math.round(confidence * 100)}%
                </span>
              </div>

              {/* Editable manual overrides */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-550 block mb-1">Dietary Description</label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={fat}
                      onChange={(e) => setFat(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 font-sans pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewStep(false)}
                  className="w-1/3 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-zinc-800"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveMeal}
                  className="w-2/3 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4 text-zinc-950 stroke-[3]" /> Add to Diary
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Daily Diary List Column - Right */}
        <div className="lg:col-span-7 bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-450">
                Daily Chemical Calibration logs
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15">
                {todaysLogs.length} logged
              </span>
            </div>

            {todaysLogs.length === 0 ? (
              <div className="text-center py-16 text-zinc-650 space-y-3">
                <Sparkles className="w-8 h-8 text-zinc-800 mx-auto opacity-30" />
                <p className="text-xs uppercase tracking-widest font-bold">Log is empty for this solar day</p>
                <p className="text-[10.5px] text-zinc-600 max-w-sm mx-auto">Input description parameters on the left pane or switch dates to audit history logs.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {todaysLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 transition shadow-inner"
                  >
                    <div className="space-y-1">
                      <h4 className="font-sans font-bold text-zinc-150 text-xs">
                        {log.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-zinc-550">
                        <span className="text-emerald-400 font-bold">{log.calories} kcal</span>
                        <span className="text-indigo-400">P: {log.protein}g</span>
                        <span className="text-blue-400">C: {log.carbs}g</span>
                        <span className="text-orange-400">F: {log.fat}g</span>
                        {log.confidence < 0.9 && (
                          <span className="bg-zinc-900 px-1.5 py-0.2 rounded text-[9px] text-zinc-500">
                            Est. {Math.round(log.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteFood(log.id)}
                      className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-900 mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-between text-[10px] font-mono text-zinc-550 uppercase tracking-widest">
            <span>Daily Expendance Deficit: {profile.maintenanceCalories - totalCaloriesToday} kcal</span>
            <span className="text-[9px] italic">REAL-TIME SQLITE STORAGE SYNC COMPLETED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
