/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserProfile, WeightLog, DailySummary } from "../types";
import { Scale, Calendar, Plus, Trash2, TrendingDown, ArrowDownRight, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface WeightTrackerProps {
  profile: UserProfile;
  weightLogs: WeightLog[];
  dailySummaries: DailySummary[];
  onAddWeight: (date: string, weight: number) => Promise<void>;
  onDeleteWeight: (id: number) => Promise<void>;
}

export default function WeightTracker({
  profile,
  weightLogs,
  dailySummaries,
  onAddWeight,
  onDeleteWeight,
}: WeightTrackerProps) {
  const [logDate, setLogDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [weightValue, setWeightValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Submit weighin log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValue || Number(weightValue) <= 0) {
      setErrorText("Please enter a valid weight.");
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    try {
      await onAddWeight(logDate, Number(weightValue));
      setWeightValue("");
    } catch (err: any) {
      setErrorText(err.message || "Failed to log weight to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Weight statistics
  const sortedLogs = [...weightLogs].sort((a,b) => b.date.localeCompare(a.date));
  const latestWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : profile.weight;
  
  // Weekly rate of loss: difference between oldest moving average and newest moving average divided by weeks elapsed.
  // Or simply simple weight delta over the last 10 days
  let weeklyLossRate = 0;
  if (weightLogs.length >= 3) {
    const oldest = [...weightLogs].sort((a,b) => a.date.localeCompare(b.date))[0];
    const newest = [...weightLogs].sort((a,b) => a.date.localeCompare(b.date))[weightLogs.length - 1];
    
    // Dates gap in days
    const days = Math.max(1, Math.round((new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)));
    const delta = oldest.weight - newest.weight; // positive is weight loss
    weeklyLossRate = Number(((delta / days) * 7).toFixed(2));
  }

  // Pre-process Recharts data: use the computed dailySummaries that have the moving average
  // We filter summaries that have either a raw weight or a weightMovingAvg logged, so that the chart is nice and tidy
  const chartData = dailySummaries
    .filter(s => s.weight !== null || s.weightMovingAvg !== null)
    .map(s => ({
      date: s.date.substring(5), // YYYY-MM-DD -> MM-DD
      "Weigh In (kg)": s.weight || undefined,
      "7-Day Average (kg)": s.weightMovingAvg || undefined,
    }));

  return (
    <div id="weight-tracker-container" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-950/40 p-5 rounded-2xl border border-zinc-805/60 gap-4">
        <div>
          <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-300 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500 animate-pulse" />
            Weigh-In Tracking & Smoothed Trendlines
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Scales can fluctuate daily due to glycogen reservoirs, intracellular fluid balances, and sodium levels. We compute a <strong>7-Day Moving Average</strong> to identify true biological fat reduction.
          </p>
        </div>
        
        {/* Loss rate banner */}
        {weeklyLossRate !== 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl flex items-center gap-3 shrink-0">
            <ArrowDownRight className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-[9px] text-zinc-500 tracking-wider uppercase font-bold font-mono">Est. Weekly loss path</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {weeklyLossRate > 0 ? `-${weeklyLossRate}` : `+${Math.abs(weeklyLossRate)}`} kg/week
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Add log Weigh in form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 shadow-2xl space-y-4">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Record Body Mass</h3>
 
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Calendar Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-650 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Body Weight (kg)</label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-zinc-650 absolute left-3.5 top-3.5" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 84.60"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {errorText && (
                <div className="text-xs bg-red-950/40 border border-red-500/20 text-red-350 p-3 rounded-xl flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-red-450 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !weightValue}
                className="w-full cursor-pointer bg-emerald-500 hover:bg-emerald-450 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 text-[10px] uppercase tracking-widest font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Save Weight Entry
              </button>
            </form>
          </div>

          {/* Quick Stats Column details */}
          <div className="bg-zinc-900/30 p-5 rounded-3xl border border-zinc-800/60 space-y-3 font-mono">
            <h4 className="text-[9px] text-zinc-550 uppercase tracking-widest font-bold font-sans">
              Dynamic Mass Indexes
            </h4>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Starting Weight:</span>
              <span className="text-zinc-350">{profile.weight} kg</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Current Logged:</span>
              <span className="text-zinc-100 font-bold">{latestWeight} kg</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Goal Target:</span>
              <span className="text-emerald-400 font-bold">{profile.goalWeight} kg</span>
            </div>
            <div className="border-t border-zinc-850 pt-2 flex justify-between items-center text-xs">
              <span className="text-zinc-550">Target Cut Offset:</span>
              <span className="text-zinc-350">{Math.max(0, Number((latestWeight - profile.goalWeight).toFixed(2)))} kg left</span>
            </div>
          </div>
        </div>

        {/* Right column: Chart & Log lists */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Wrapper with Recharts */}
          <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 shadow-xl">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4 pb-2 border-b border-zinc-850">
              Weight Trendline Comparison vs 7-Day Moving Average
            </h3>

            {chartData.length < 2 ? (
              <div className="h-[280px] bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-center p-6">
                <div className="space-y-2 max-w-sm text-zinc-600">
                  <TrendingDown className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Awaiting calibration logs</p>
                  <p className="text-[10.5px] leading-relaxed">
                    Graph plotting requires at least 2 distinct daily data inputs to compute trend derivatives correctly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                    <XAxis
                      dataKey="date"
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                      className="font-mono"
                    />
                    <YAxis
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                      domain={['dataMin - 1', 'dataMax + 1']}
                      className="font-mono"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        color: "#f4f4f5",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "monospace", marginTop: "10px" }} />
                    <ReferenceLine
                      y={profile.goalWeight}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: "TARGET WEIGHT", fill: "#10b981", fontSize: 9, position: "top", fontFamily: "monospace", letterSpacing: "1px" }}
                    />
                    {/* Raw dot weights */}
                    <Line
                      name="Raw Logs (kg)"
                      type="monotone"
                      dataKey="Weigh In (kg)"
                      stroke="#818cf8"
                      strokeWidth={1}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                    {/* Moving 7 day line */}
                    <Line
                      name="7-Day Avg (kg)"
                      type="monotone"
                      dataKey="7-Day Average (kg)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Database elements list */}
          <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/80 shadow-xl flex flex-col justify-between">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 border-b border-zinc-850 pb-3 mb-4">
              Weigh-In Journals & Logs
            </h3>

            {sortedLogs.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-zinc-650 uppercase font-mono">
                No archived weight logs stored.
              </div>
            ) : (
              <div className="max-h-[140px] overflow-y-auto pr-1">
                <div className="space-y-2">
                  {sortedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 font-mono text-xs border border-zinc-850"
                    >
                      <div className="flex items-center gap-4 text-zinc-450">
                        <Calendar className="w-4 h-4 text-zinc-600" />
                        <span>{log.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-zinc-100 font-bold">{log.weight} kg</span>
                        <button
                          onClick={() => onDeleteWeight(log.id)}
                          className="text-zinc-650 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete weight entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
