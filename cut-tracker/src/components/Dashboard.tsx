/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { UserProfile, WeightLog, FoodLog, DailySummary, WeeklyAnalysis } from "../types";
import { calculateStreak } from "../utils";
import { Flame, Target, Trophy, Scale, ShieldAlert, Zap, TrendingDown, ArrowRight } from "lucide-react";

interface DashboardProps {
  profile: UserProfile;
  weightLogs: WeightLog[];
  foodLogs: FoodLog[];
  dailySummaries: DailySummary[];
  weeklyAnalysis: WeeklyAnalysis;
  onSwitchTab: (tab: string) => void;
}

export default function Dashboard({
  profile,
  weightLogs,
  foodLogs,
  dailySummaries,
  weeklyAnalysis,
  onSwitchTab,
}: DashboardProps) {
  // Sort weighs to find latest
  const sortedWeights = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date));
  const currentLoggedWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : profile.weight;
  
  // Progress toward goal weight calculation
  // Percentage = (start - current) / (start - goal)
  const totalChangeNeeded = Math.abs(profile.weight - profile.goalWeight);
  const changeDone = Math.abs(profile.weight - currentLoggedWeight);
  const progressPercent = totalChangeNeeded > 0 
    ? Math.min(100, Math.round((changeDone / totalChangeNeeded) * 100)) 
    : 100;

  // Logging streak
  const streak = calculateStreak(foodLogs, weightLogs);

  // Protein-first check (last 7 days average of logged protein versus target)
  const proteinWarning = foodLogs.length > 0 && weeklyAnalysis.avgDailyProtein < profile.proteinTarget;

  // Let's get today's consumed statistics
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySummary = dailySummaries.find(s => s.date === todayStr) || {
    caloriesConsumed: 0,
    proteinConsumed: 0,
    calorieTarget: profile.calorieTarget,
    proteinTarget: profile.proteinTarget,
    calorieDeficit: profile.maintenanceCalories
  };

  const caloriesRemaining = profile.calorieTarget - todaySummary.caloriesConsumed;
  const proteinRemaining = profile.proteinTarget - todaySummary.proteinConsumed;

  return (
    <div id="cut-dashboard-container" className="space-y-6 animate-fade-in">
      {/* Welcome Banner & Streak Counter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-zinc-900 to-indigo-950/40 p-6 rounded-3xl border border-zinc-800/60 shadow-2xl gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1 uppercase">
            Welcome back, <span className="text-emerald-400 italic">{profile.name}</span>
          </h2>
          <p className="text-zinc-400 text-xs tracking-wide">
            You are currently on a <span className="text-emerald-400 font-medium font-mono">{profile.rateOfLoss} kg/week</span> cutting cycle. Hit your protein and target deficits.
          </p>
        </div>
        
        {/* Streak component badge */}
        <div className="flex items-center gap-3 bg-zinc-950/80 px-4 py-2.5 rounded-2xl border border-zinc-800 shadow self-start md:self-auto">
          <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
          <div className="text-left font-mono">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Current Streak</div>
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-1">
              {streak} {streak === 1 ? "Day" : "Days"}
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Protein consistency Warning Banner */}
      {proteinWarning && (
        <div className="bg-orange-500/5 border border-orange-500/15 rounded-3xl p-4 flex items-start gap-4 shadow-xl">
          <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-orange-400 text-xs uppercase tracking-wider">Protein targets missed!</h4>
            <p className="text-xs text-zinc-350 leading-relaxed">
              Your average protein intake this week is <span className="font-bold underline text-orange-300 font-mono">{weeklyAnalysis.avgDailyProtein}g</span>, which lies below your daily target of <span className="font-bold font-mono">{profile.proteinTarget}g</span>. Maintain high amino-acid profiles to protect lean skeletal tissue.
            </p>
          </div>
        </div>
      )}

      {/* Goal weight Progress Card */}
      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Weight Goal Pathway</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            {progressPercent}% Achieved
          </span>
        </div>

        {/* Weights details bar */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 bg-zinc-950/70 rounded-2xl border border-zinc-800/50 font-mono">
          <div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Start</div>
            <div className="text-xs font-bold text-zinc-350">{profile.weight} kg</div>
          </div>
          <div className="border-x border-zinc-800/45">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Current</div>
            <div className="text-xs font-bold text-zinc-100">{currentLoggedWeight} kg</div>
          </div>
          <div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Goal</div>
            <div className="text-xs font-bold text-emerald-400">{profile.goalWeight} kg</div>
          </div>
        </div>

        {/* Custom graphic progress bar with high glow */}
        <div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800/60 shadow-inner">
            <div 
              className="bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent || 1}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-wider">
            <span>Remaining: {Math.max(0, Number((currentLoggedWeight - profile.goalWeight).toFixed(2)))} kg</span>
            <span>Completed Cut: {changeDone.toFixed(1)} kg</span>
          </div>
        </div>
      </div>

      {/* Key Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core daily metrics cards */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest">Maintenance</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-zinc-100">{profile.maintenanceCalories}</div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">kcal/day budgeted</p>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest">Daily Limit</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-zinc-100">{profile.calorieTarget}</div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">Deficit: {profile.maintenanceCalories - profile.calorieTarget} kcal</p>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest">Avg Intake</span>
            <Flame className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-zinc-100">{weeklyAnalysis.avgDailyCalories || "---"}</div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">kcal avg this week</p>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest">Amino targets</span>
            <Scale className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-zinc-100">{profile.proteinTarget}g</div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">Avg: {weeklyAnalysis.avgDailyProtein || 0}g logged</p>
          </div>
        </div>
      </div>

      {/* Today's Budget Ring Meter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/70 shadow-xl space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 flex items-center justify-between">
            <span>Daily Calorie Budget</span>
            <span className="text-[10px] font-mono text-zinc-500">{todayStr}</span>
          </h3>

          <div className="space-y-4 pt-1">
            <div className="flex justify-between text-xs text-zinc-400 font-mono uppercase tracking-wide">
              <span>Target: {profile.calorieTarget} kcal</span>
              <span>Logged: {todaySummary.caloriesConsumed} kcal</span>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-855 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  todaySummary.caloriesConsumed > profile.calorieTarget 
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                    : todaySummary.caloriesConsumed > profile.calorieTarget * 0.9 
                    ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                    : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                }`}
                style={{ width: `${Math.min(100, (todaySummary.caloriesConsumed / profile.calorieTarget) * 100) || 1}%` }}
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-wider">Remaining capacity</span>
              <span className={`text-lg font-mono font-bold ${caloriesRemaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {caloriesRemaining} kcal
              </span>
            </div>
            
            <button 
              onClick={() => onSwitchTab("food")}
              className="w-full mt-2 cursor-pointer bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition flex items-center justify-center gap-2 border border-zinc-800 shadow"
            >
              Log Food Diary <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Today's Protein Goals Meter */}
        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/70 shadow-xl space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 flex items-center justify-between">
            <span>Essential Protein logs</span>
            <span className="text-[10px] uppercase font-mono text-zinc-500">Leucine Threshold</span>
          </h3>

          <div className="space-y-4 pt-1">
            <div className="flex justify-between text-xs text-zinc-400 font-mono uppercase tracking-wide">
              <span>Target: {profile.proteinTarget}g</span>
              <span>Logged: {todaySummary.proteinConsumed}g</span>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-855 shadow-inner">
              <div 
                className="bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (todaySummary.proteinConsumed / profile.proteinTarget) * 100) || 1}%` }}
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-wider">Remaining gap</span>
              <span className={`text-lg font-mono font-bold ${proteinRemaining <= 0 ? "text-emerald-400" : "text-indigo-400"}`}>
                {proteinRemaining <= 0 ? "TARGET HIT! 🎉" : `${proteinRemaining}g`}
              </span>
            </div>

            <button 
              onClick={() => onSwitchTab("food")}
              className="w-full mt-2 cursor-pointer bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition flex items-center justify-center gap-2 border border-zinc-800 shadow"
            >
              Add Amino Source <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Deficit Analysis Block */}
      <div className="bg-zinc-900/20 p-6 rounded-3xl border border-zinc-800/60 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          Weekly Deficit & Deficit Modeling
        </h3>
        <p className="text-[11px] text-zinc-500 leading-normal">
          This mathematical model aggregates logged balances against your biological expendance thresholds. Weight loss is formulated around the core thermodynamics constants (`Deficit / 7700`).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 font-mono">
          {/* Deficit calculations columns */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Weekly Deficit Sum</span>
            <div className="text-xl font-bold text-zinc-100 mb-1">
              {weeklyAnalysis.weeklyCalorieDeficit} <span className="text-[10px] text-zinc-500 uppercase">kcal</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-sans leading-normal">
              Accumulated deficit across the logged week.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] text-emerald-500 uppercase font-bold block mb-1">Projected Weight Loss</span>
            <div className="text-xl font-bold text-emerald-450 mb-1">
              {weeklyAnalysis.predictedFatLoss} <span className="text-[10px] text-emerald-500">kg</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-sans leading-normal">
              Calculated using standard lipid energy constant values.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Scale Deviation</span>
            <div className={`text-xl font-bold mb-1 ${weeklyAnalysis.actualWeightChange < 0 ? "text-emerald-400" : "text-zinc-350"}`}>
              {weeklyAnalysis.actualWeightChange} <span className="text-[10px] text-zinc-500">kg</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-sans leading-normal">
              Gap between oldest and latest logged weigh-ins.
            </p>
          </div>
        </div>

        {/* Prediction Vs scale actual comparison chart details */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50 text-xs text-zinc-400 flex items-center justify-between font-mono">
          <span className="uppercase text-[9px] tracking-wider text-zinc-550 font-bold">Model Deviation Variance</span>
          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded text-[10px] font-bold border border-emerald-500/15">
            {weeklyAnalysis.weeklyCalorieDeficit === 0 
              ? "AWAITING BALANCE TRACK" 
              : `Deviation: ${Math.abs(weeklyAnalysis.difference)} kg`}
          </span>
        </div>
      </div>
    </div>
  );
}
