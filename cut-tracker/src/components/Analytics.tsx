/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { UserProfile, WeightLog, FoodLog, DailySummary, WeeklyAnalysis } from "../types";
import { convertLogsToCsv } from "../utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  BarChart2,
  Download,
  Upload,
  Calendar,
  Hourglass,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface AnalyticsProps {
  profile: UserProfile;
  weightLogs: WeightLog[];
  foodLogs: FoodLog[];
  dailySummaries: DailySummary[];
  weeklyAnalysis: WeeklyAnalysis;
  onImportData: (data: { profile: UserProfile; weights: Omit<WeightLog, "id">[]; foods: Omit<FoodLog, "id">[] }) => Promise<void>;
}

export default function Analytics({
  profile,
  weightLogs,
  foodLogs,
  dailySummaries,
  weeklyAnalysis,
  onImportData,
}: AnalyticsProps) {
  // JSON File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Parse latest weight
  const sortedWeights = [...weightLogs].sort((a,b) => b.date.localeCompare(a.date));
  const latestWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : profile.weight;
  const remainingWeightToCut = Math.max(0, Number((latestWeight - profile.goalWeight).toFixed(2)));

  // Goal Date Prediction
  let predictedGoalWeeks: number | null = null;
  let predictedGoalString = "Awaiting cut rate specification";
  if (profile.rateOfLoss > 0 && remainingWeightToCut > 0) {
    predictedGoalWeeks = remainingWeightToCut / profile.rateOfLoss;
    
    const targetMs = Date.now() + (predictedGoalWeeks * 7 * 24 * 60 * 60 * 1000);
    const targetDate = new Date(targetMs);
    predictedGoalString = targetDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (remainingWeightToCut === 0) {
    predictedGoalString = "Goal Weight Already Achieved! 🎉";
  }

  // Pre-process Recharts daily metrics graphs data
  const chartsData = dailySummaries.map(s => ({
    date: s.date.substring(5), // YYYY-MM-DD -> MM-DD
    "Calories (kcal)": s.caloriesConsumed,
    "Target Calories": s.calorieTarget,
    "Protein (g)": s.proteinConsumed,
    "Target Protein": s.proteinTarget,
    "Deficit (kcal)": s.calorieDeficit,
    "Weight (kg)": s.weight || undefined,
    "Moving Avg (kg)": s.weightMovingAvg || undefined,
  }));

  // JSON export
  const handleExportJson = () => {
    // Strip IDs from local weights / logs for portable migration files
    const cleanWeights = weightLogs.map(({ id, ...rest }) => rest);
    const cleanFoods = foodLogs.map(({ id, ...rest }) => rest);

    const exportBundle = {
      profile,
      weights: cleanWeights,
      foods: cleanFoods,
    };

    const str = JSON.stringify(exportBundle, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(str);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `cut_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.profile || !Array.isArray(parsed.weights) || !Array.isArray(parsed.foods)) {
          throw new Error("Invalid file schema. Backup file must contain 'profile', 'weights', and 'foods' keys.");
        }

        await onImportData(parsed);
        setImportStatus({ success: true, msg: "Backup file synced successfully with SQLite!" });
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err: any) {
        setImportStatus({ success: false, msg: `Import failed: ${err.message}` });
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="analytics-view-container" className="space-y-8 animate-fade-in">
      
      {/* Goal Prediction Card */}
      <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 p-6 rounded-3xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500">
            <Hourglass className="w-5 h-5 text-emerald-500 fill-emerald-500/15" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Biological Projection Engine</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-200">
            Estimated Goal Weight Target
          </h2>
          <p className="text-[11px] text-zinc-500">
            Computed by translating active weekly cut rate (<span className="text-zinc-350 font-mono font-bold">{profile.rateOfLoss} kg/week</span>) across remaining biological fat mass.
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl min-w-[280px]">
          <Calendar className="w-8 h-8 text-emerald-500 shrink-0 animate-pulse" />
          <div>
            <div className="text-[8px] text-zinc-650 uppercase tracking-widest font-mono font-bold">Predicted Completion Date</div>
            <div className="text-xs font-bold text-zinc-200 font-sans mt-1 uppercase tracking-wider">
              {predictedGoalString}
            </div>
            {predictedGoalWeeks !== null && remainingWeightToCut > 0 && (
              <p className="text-[10.5px] text-zinc-400 font-mono mt-1">
                Approx. <span className="text-emerald-400 font-bold">{predictedGoalWeeks.toFixed(1)}</span> weeks remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced charts grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caloric Intake Rechart */}
        <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">
            Daily Calories vs target budget
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} className="font-mono" />
                <YAxis stroke="#52525b" fontSize={10} className="font-mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    borderRadius: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", fontFamily: "monospace" }} />
                <ReferenceLine
                  y={profile.calorieTarget}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: "TARGET LIMIT", fill: "#ef4444", fontSize: 8, position: "top", fontFamily: "monospace", letterSpacing: "1px" }}
                />
                <Bar name="Consumed (kcal)" dataKey="Calories (kcal)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protein Intake Rechart */}
        <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">
            Daily Protein logged vs custom target
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} className="font-mono" />
                <YAxis stroke="#52525b" fontSize={10} className="font-mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    borderRadius: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", fontFamily: "monospace" }} />
                <ReferenceLine
                  y={profile.proteinTarget}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  label={{ value: "PROTEIN TARGET", fill: "#10b981", fontSize: 8, position: "top", fontFamily: "monospace", letterSpacing: "1px" }}
                />
                <Bar name="Protein (g)" dataKey="Protein (g)" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Caloric Deficit Rechart */}
        <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">
            Metabolic Deficit Levels & Trends (kcal)
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChartShim data={chartsData} />
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smoothed Weight Moving trajectory */}
        <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">
            Body Weight Tracking Trajectory
          </h3>
          <div className="h-[240px]">
            {weightLogs.length < 2 ? (
              <div className="h-full bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-center p-6 text-zinc-600 font-mono text-xs">
                Log weight on multiple dates to compute biological trend derivatives.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                  <XAxis dataKey="date" stroke="#52525b" fontSize={10} className="font-mono" />
                  <YAxis stroke="#52525b" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} className="font-mono" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      color: "#f4f4f5",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", fontFamily: "monospace" }} />
                  <Line name="Body Weight (kg)" type="monotone" dataKey="Weight (kg)" stroke="#818cf8" strokeWidth={1} dot={{ r: 3 }} />
                  <Line name="7-Day Smoothed Avg" type="monotone" dataKey="Moving Avg (kg)" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Import / Export & Data Protection Module */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
        <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-350">
          Data Protection, Backup & Exports
        </h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Your biometrics data is completely stored locally inside the application's secure SQLite database on your device. Use the backup triggers below to backup your weights, food inputs, and user settings to standard offline file bundles or spreadsheet sheets.
        </p>

        {importStatus && (
          <div className={`p-3 rounded-xl border text-[11px] flex items-center gap-2 font-mono ${
            importStatus.success ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-250" : "bg-red-950/30 border-red-500/20 text-red-250"
          }`}>
            {importStatus.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span>{importStatus.msg}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-4 pt-2">
          {/* Export JSON backup link */}
          <button
            onClick={handleExportJson}
            className="cursor-pointer bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-[10px] uppercase font-bold tracking-widest px-5 py-3 rounded-xl transition flex items-center gap-2 border border-zinc-800 shadow"
          >
            <FileCode className="w-4 h-4 text-emerald-550" /> Export JSON Backup (.json)
          </button>

          {/* Export CSV sheet */}
          <a
            href={convertLogsToCsv(foodLogs, weightLogs)}
            download={`cut_tracker_log_${new Date().toISOString().split('T')[0]}.csv`}
            className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-[10px] uppercase font-bold tracking-widest px-5 py-3 rounded-xl transition flex items-center gap-2 border border-zinc-800 shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-450" /> Export CSV Sheet (.csv)
          </a>

          {/* Import JSON button wrapper */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-[10px] uppercase font-bold tracking-widest px-5 py-3 rounded-xl transition flex items-center gap-2 border border-emerald-500/20 shadow-lg"
          >
            <Upload className="w-4 h-4 text-emerald-400" /> Import JSON Backup
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

// Sub component to handle Area chart mapping the deficits clearly
import { AreaChart, Area } from "recharts";
function AreaChartShim({ data }: { data: any[] }) {
  return (
    <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
      <XAxis dataKey="date" stroke="#52525b" fontSize={10} className="font-mono" />
      <YAxis stroke="#52525b" fontSize={10} className="font-mono" />
      <Tooltip
        contentStyle={{
          backgroundColor: "#09090b",
          borderColor: "#27272a",
          color: "#f4f4f5",
          fontSize: "11px",
          fontFamily: "monospace",
          borderRadius: "12px",
        }}
      />
      <Legend wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", fontFamily: "monospace" }} />
      <Area
        name="Caloric Deficit"
        type="monotone"
        dataKey="Deficit (kcal)"
        stroke="#f97316"
        fill="#f97316"
        fillOpacity={0.12}
      />
    </AreaChart>
  );
}
