/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { UserProfile, WeightLog, FoodLog, DailySummary, LLMConfig, WeeklyAnalysis } from "./types";
import { getTrailingDates, buildDailySummaries, calculateWeeklyAnalysis } from "./utils";
import Dashboard from "./components/Dashboard";
import FoodDiary from "./components/FoodDiary";
import WeightTracker from "./components/WeightTracker";
import Analytics from "./components/Analytics";
import ProfileSettings from "./components/ProfileSettings";
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingDown,
  Settings2,
  LineChart,
  Flame,
  CheckCircle2,
  Users,
  Plus
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  // Load basic configurations on load
  useEffect(() => {
    async function loadInitial() {
      try {
        // Fetch LLM Config
        const llmRes = await fetch("/api/llm-config");
        if (llmRes.ok) {
          const llmData = await llmRes.json();
          setLlmConfig(llmData);
        }

        // Fetch User Profiles
        const profilesRes = await fetch("/api/profiles");
        if (profilesRes.ok) {
          const pData = await profilesRes.json();
          setProfiles(pData);
          if (pData.length > 0) {
            setActiveProfile(pData[0]);
            await loadUserData(pData[0].id);
          }
        }
      } catch (err: any) {
        setAppError("Failed to communicate with Express server: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Fetch biometric specific weight and food logs
  async function loadUserData(userId: string) {
    try {
      const wRes = await fetch(`/api/weights/${userId}`);
      if (wRes.ok) {
        const wData = await wRes.json();
        setWeightLogs(wData);
      }

      const fRes = await fetch(`/api/foods/${userId}`);
      if (fRes.ok) {
        const fData = await fRes.json();
        setFoodLogs(fData);
      }
    } catch (err: any) {
      console.error("Failed to load weight/diet diaries", err);
    }
  }

  // Profile Switching mechanism
  const handleProfileSwitch = async (id: string) => {
    setIsLoading(true);
    const selected = profiles.find(p => p.id === id);
    if (selected) {
      setActiveProfile(selected);
      await loadUserData(id);
    }
    setIsLoading(false);
  };

  // Profile Creation / Saving Settings
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });
      if (!res.ok) throw new Error("Could not sync profile to backend database.");

      // Refresh listings
      const pRes = await fetch("/api/profiles");
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfiles(pData);
        const current = pData.find((p: UserProfile) => p.id === updatedProfile.id) || updatedProfile;
        setActiveProfile(current);
      }
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    }
  };

  // Add a new profile wizard
  const handleCreateNewProfile = async () => {
    const name = prompt("Enter a name for the new profile:");
    if (!name || !name.trim()) return;

    const newId = "profile-" + Math.random().toString(36).substring(2, 9);
    const newProfile: UserProfile = {
      id: newId,
      name: name.trim(),
      age: 30,
      sex: "male",
      height: 175,
      weight: 80.0,
      goalWeight: 72.0,
      activityLevel: "moderately_active",
      rateOfLoss: 0.5,
      maintenanceCalories: 2400,
      calorieTarget: 1950,
      proteinTarget: 150,
      manualOverride: false,
    };

    setIsLoading(true);
    await handleSaveProfile(newProfile);
    setActiveProfile(newProfile);
    await loadUserData(newId);
    setIsLoading(false);
  };

  // Manage Weight Records
  const handleAddWeight = async (date: string, weight: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeProfile.id, date, weight }),
      });
      if (!res.ok) throw new Error("Server failed to commit weighing log.");
      await loadUserData(activeProfile.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteWeight = async (id: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/weights/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed.");
      await loadUserData(activeProfile.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manage Food Records
  const handleAddFood = async (log: Omit<FoodLog, "id">) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (!res.ok) throw new Error("Could not log food.");
      await loadUserData(activeProfile.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFood = async (id: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete diet log.");
      await loadUserData(activeProfile.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save LLM Config endpoint
  const handleSaveLlmConfig = async (config: LLMConfig) => {
    try {
      const res = await fetch("/api/llm-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save configuration settings.");
      setLlmConfig(config);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Clear all telemetry logs for current profile
  const handleClearAllLogs = async () => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/clear-logs/${activeProfile.id}`, { method: "POST" });
      if (!res.ok) throw new Error("Server failed to clear logs.");
      await loadUserData(activeProfile.id);
    } catch (err: any) {
      alert("Error clearing logs: " + err.message);
    }
  };

  // Import full JSON bundle
  const handleImportBundle = async (bundle: { profile: UserProfile; weights: Omit<WeightLog, "id">[]; foods: Omit<FoodLog, "id">[] }) => {
    setIsLoading(true);
    try {
      // 1. Save profile
      await handleSaveProfile(bundle.profile);
      
      // 2. Upload Weights sequentially
      for (const w of bundle.weights) {
        await fetch("/api/weights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: bundle.profile.id, date: w.date, weight: w.weight }),
        });
      }

      // 3. Upload Foods sequentially
      for (const f of bundle.foods) {
        await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: bundle.profile.id,
            date: f.date,
            description: f.description,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            confidence: f.confidence,
          }),
        });
      }

      // Sync active view
      setActiveProfile(bundle.profile);
      await loadUserData(bundle.profile.id);
    } catch (err: any) {
      alert("Error parsing backup data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate 30 trailing days of analytics sums
  const trailingDateKeys = getTrailingDates(30);
  const hasProfile = activeProfile !== null;
  
  const dailySummaries = hasProfile 
    ? buildDailySummaries(trailingDateKeys, weightLogs, foodLogs, activeProfile!) 
    : [];

  const weeklyAnalysis = hasProfile 
    ? calculateWeeklyAnalysis(dailySummaries.slice(-7), weightLogs) 
    : {
        avgDailyCalories: 0,
        avgDailyProtein: 0,
        weeklyCalorieDeficit: 0,
        predictedFatLoss: 0,
        actualWeightChange: 0,
        difference: 0
      };

  // Today's metabolic outputs for the layout footer
  const todayStr = new Date().toISOString().split("T")[0];
  const todayFoods = foodLogs.filter(f => f.date === todayStr);
  const caloriesToday = todayFoods.reduce((sum, f) => sum + f.calories, 0);
  const proteinToday = todayFoods.reduce((sum, f) => sum + f.protein, 0);
  const calorieTarget = activeProfile?.calorieTarget || 2000;
  const proteinTarget = activeProfile?.proteinTarget || 150;
  const calorieRemaining = Math.max(0, calorieTarget - caloriesToday);
  const proteinGap = Math.max(0, proteinTarget - proteinToday);
  const currentDeficit = Math.max(0, (activeProfile?.maintenanceCalories || 2500) - caloriesToday);

  return (
    <div id="cut-tracker-app-root" className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      {/* Universal Immersive Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 md:px-8 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300">
            <Flame className="w-5 h-5 text-zinc-950 fill-zinc-950/10" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase italic text-zinc-100 leading-none">Cut Tracker</h1>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Calibration Engine</span>
          </div>
        </div>

        {/* Profile Switcher & LLM indicators styled in zinc */}
        {hasProfile && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400">SQLite active</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-inner">
                <Users className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                <select
                  value={activeProfile?.id}
                  onChange={(e) => handleProfileSwitch(e.target.value)}
                  className="bg-transparent text-xs text-zinc-300 focus:outline-none pr-1 select-none font-medium cursor-pointer"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id} className="bg-zinc-950 text-zinc-350">{p.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleCreateNewProfile}
                title="Add profile"
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-xl cursor-pointer transition text-zinc-400 hover:text-emerald-400"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Body Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar Pane */}
        <nav className="lg:col-span-3 bg-zinc-950/30 p-4 border border-zinc-800/50 rounded-2xl space-y-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "text-zinc-450 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5 text-emerald-500/80" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("food")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "food"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "text-zinc-450 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
            }`}
          >
            <UtensilsCrossed className="w-4.5 h-4.5 text-emerald-500/80" />
            Diet Diaries
          </button>

          <button
            onClick={() => setActiveTab("weight")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "weight"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "text-zinc-450 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
            }`}
          >
            <TrendingDown className="w-4.5 h-4.5 text-emerald-500/80" />
            Weigh-Ins
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "text-zinc-450 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
            }`}
          >
            <LineChart className="w-4.5 h-4.5 text-emerald-500/80" />
            Bio Analysis
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "text-zinc-450 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
            }`}
          >
            <Settings2 className="w-4.5 h-4.5 text-emerald-500/80" />
            Configuration
          </button>
        </nav>

        {/* Dynamic View Panel - Right */}
        <main className="lg:col-span-9 bg-transparent space-y-6">
          {appError && (
            <div className="bg-red-950/25 border border-red-500/25 p-4 rounded-xl text-red-400 text-sm flex gap-3">
              <span className="font-bold">App Error:</span> {appError}
            </div>
          )}

          {isLoading ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-slate-500">Loading your cutting profiles & biometric metrics...</p>
            </div>
          ) : !hasProfile ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow text-center max-w-lg mx-auto space-y-4">
              <Users className="w-12 h-12 text-slate-650 mx-auto" />
              <h3 className="text-lg font-display font-medium text-white">Create Biometric Profile</h3>
              <p className="text-xs text-slate-400">
                To start tracking your deficit biological trajectory, create a biometric profile with age, height, current starting weight, goal mass, and weekly speed preferences.
              </p>
              <button
                onClick={handleCreateNewProfile}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition"
              >
                Create Profile Now
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <Dashboard
                  profile={activeProfile!}
                  weightLogs={weightLogs}
                  foodLogs={foodLogs}
                  dailySummaries={dailySummaries}
                  weeklyAnalysis={weeklyAnalysis}
                  onSwitchTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "food" && (
                <FoodDiary
                  profile={activeProfile!}
                  foodLogs={foodLogs}
                  onAddFood={handleAddFood}
                  onDeleteFood={handleDeleteFood}
                />
              )}

              {activeTab === "weight" && (
                <WeightTracker
                  profile={activeProfile!}
                  weightLogs={weightLogs}
                  dailySummaries={dailySummaries}
                  onAddWeight={handleAddWeight}
                  onDeleteWeight={handleDeleteWeight}
                />
              )}

              {activeTab === "analytics" && (
                <Analytics
                  profile={activeProfile!}
                  weightLogs={weightLogs}
                  foodLogs={foodLogs}
                  dailySummaries={dailySummaries}
                  weeklyAnalysis={weeklyAnalysis}
                  onImportData={handleImportBundle}
                />
              )}

              {activeTab === "settings" && (
                <ProfileSettings
                  profile={activeProfile!}
                  llmConfig={llmConfig!}
                  onSaveProfile={handleSaveProfile}
                  onSaveLlmConfig={handleSaveLlmConfig}
                  onClearAllLogs={handleClearAllLogs}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Universal Bottom Stats Bar / Footer */}
      <footer className="h-14 border-t border-zinc-800/50 bg-zinc-950 flex flex-col md:flex-row items-center px-4 md:px-8 justify-between mt-auto gap-2 py-2 md:py-0">
        <div className="flex flex-wrap gap-4 md:gap-8 justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Current Deficit:</span>
            <span className="text-xs md:text-sm font-mono text-emerald-400 font-bold">-{currentDeficit} kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Remaining Cal:</span>
            <span className="text-xs md:text-sm font-mono text-zinc-300 font-bold">{calorieRemaining} kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Protein Gap:</span>
            <span className="text-xs md:text-sm font-mono text-indigo-400 font-bold">{proteinGap}g</span>
          </div>
        </div>
        <div className="text-[9px] text-zinc-650 font-mono tracking-widest uppercase">
          UTC: 2026.06.08 | METABOLIC RATIO ACTIVE
        </div>
      </footer>
    </div>
  );
}
