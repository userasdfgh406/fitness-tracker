/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, LLMConfig } from "../types";
import { ACTIVITY_LABELS, calculateBMR, calculateMaintenance, calculateCalorieAndProteinTarget } from "../utils";
import { User, Cpu, Save, Settings2, Trash2, CheckCircle2, RotateCcw, HelpCircle } from "lucide-react";

interface ProfileSettingsProps {
  profile: UserProfile;
  llmConfig: LLMConfig;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onSaveLlmConfig: (config: LLMConfig) => Promise<void>;
  onClearAllLogs: () => Promise<void>;
}

export default function ProfileSettings({
  profile,
  llmConfig,
  onSaveProfile,
  onSaveLlmConfig,
  onClearAllLogs,
}: ProfileSettingsProps) {
  // Profile state
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [sex, setSex] = useState(profile.sex);
  const [height, setHeight] = useState(profile.height);
  const [weight, setWeight] = useState(profile.weight);
  const [goalWeight, setGoalWeight] = useState(profile.goalWeight);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel);
  const [rateOfLoss, setRateOfLoss] = useState(profile.rateOfLoss);
  
  const [manualOverride, setManualOverride] = useState(profile.manualOverride);
  const [manualCalorieTarget, setManualCalorieTarget] = useState(profile.calorieTarget);
  const [manualProteinTarget, setManualProteinTarget] = useState(profile.proteinTarget);

  // LLM Config state
  const [provider, setProvider] = useState(llmConfig.provider);
  const [endpoint, setEndpoint] = useState(llmConfig.endpoint);
  const [model, setModel] = useState(llmConfig.model);

  // Success indicators
  const [profileSaved, setProfileSaved] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);

  // Automatic target formulations
  const calculatedBmr = calculateBMR(age, sex, height, weight);
  const calculatedMaintenance = calculateMaintenance(calculatedBmr, activityLevel);
  const autoTargets = calculateCalorieAndProteinTarget(calculatedMaintenance, weight, rateOfLoss);

  // Auto targets dependency update
  useEffect(() => {
    if (!manualOverride) {
      setManualCalorieTarget(autoTargets.calorieTarget);
      setManualProteinTarget(autoTargets.proteinTarget);
    }
  }, [age, sex, height, weight, activityLevel, rateOfLoss, manualOverride, autoTargets.calorieTarget, autoTargets.proteinTarget]);

  // Sync state if profile prop changes
  useEffect(() => {
    setName(profile.name);
    setAge(profile.age);
    setSex(profile.sex);
    setHeight(profile.height);
    setWeight(profile.weight);
    setGoalWeight(profile.goalWeight);
    setActivityLevel(profile.activityLevel);
    setRateOfLoss(profile.rateOfLoss);
    setManualOverride(profile.manualOverride);
    setManualCalorieTarget(profile.calorieTarget);
    setManualProteinTarget(profile.proteinTarget);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(false);
    
    const updatedProfile: UserProfile = {
      id: profile.id,
      name,
      age: Number(age),
      sex,
      height: Number(height),
      weight: Number(weight),
      goalWeight: Number(goalWeight),
      activityLevel,
      rateOfLoss: Number(rateOfLoss),
      maintenanceCalories: calculatedMaintenance,
      calorieTarget: manualOverride ? Number(manualCalorieTarget) : autoTargets.calorieTarget,
      proteinTarget: manualOverride ? Number(manualProteinTarget) : autoTargets.proteinTarget,
      manualOverride,
    };

    try {
      await onSaveProfile(updatedProfile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLlmSaved(false);

    const updatedLlm: LLMConfig = {
      provider,
      endpoint,
      model,
    };

    try {
      await onSaveLlmConfig(updatedLlm);
      setLlmSaved(true);
      setTimeout(() => setLlmSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="profile-settings-container" className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Profile Form */}
        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3.5">
            <User className="w-5 h-5 text-emerald-500 animate-pulse" />
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Biometric Profile Details</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Biological Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Average</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Age (yrs)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold font-sans text-zinc-550 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Goal Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Target Cut Rate</label>
                <select
                  value={rateOfLoss}
                  onChange={(e) => setRateOfLoss(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 text-xs text-zinc-250 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value={0.25}>0.25 kg/wk (Slow Cut)</option>
                  <option value={0.5}>0.5 kg/wk (Standard Cut)</option>
                  <option value={0.75}>0.75 kg/wk (Aggressive Cut)</option>
                  <option value={1.0}>1.0 kg/wk (Extreme Limit)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-550 block mb-1 font-sans">Active Metabolism Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-250 focus:outline-none focus:border-emerald-500"
              >
                {Object.entries(ACTIVITY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>

            {/* Target Overrides */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-sans">Override Target Calculations</span>
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={(e) => setManualOverride(e.target.checked)}
                  className="w-4 h-4 text-emerald-550 focus:ring-emerald-500 border-zinc-800 rounded cursor-pointer"
                />
              </div>

              {manualOverride ? (
                <div className="grid grid-cols-2 gap-4 font-mono text-xs pt-2">
                  <div>
                    <label className="text-[9px] font-sans uppercase text-zinc-500 block mb-1">Custom Calories (kcal)</label>
                    <input
                      type="number"
                      value={manualCalorieTarget}
                      onChange={(e) => setManualCalorieTarget(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-sans uppercase text-zinc-500 block mb-1">Custom Protein (g)</label>
                    <input
                      type="number"
                      value={manualProteinTarget}
                      onChange={(e) => setManualProteinTarget(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 leading-normal font-sans">
                  Our algorithm automatically calculates targets according to your biometric specifications: Daily calorie budget of <span className="text-zinc-200 font-mono font-bold">{autoTargets.calorieTarget} kcal</span> and protein targets of <span className="text-zinc-200 font-mono font-bold">{autoTargets.proteinTarget}g</span>.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer bg-emerald-500 hover:bg-emerald-450 text-zinc-950 font-bold py-4 rounded-xl text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg"
            >
              {profileSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0 stroke-[3]" /> Biometrics Updated!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Biometrics Settings
                </>
              )}
            </button>
          </form>
        </div>

        {/* Local LLM Persistent Client Configuration Form */}
        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3.5">
            <Cpu className="w-5 h-5 text-emerald-500 animate-pulse" />
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Model Engine Configuration</h3>
          </div>

          <div className="text-[11px] text-zinc-500 space-y-2 leading-relaxed">
            <p>
              Cut Tracker integrates with models running on your local machine to estimate calories and protein, keeping your dietary data completely private.
            </p>
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-[10px] font-mono space-y-1 text-zinc-600">
              <span className="text-emerald-400 font-bold block mb-1 uppercase tracking-wider">Recommended Local Endpoints:</span>
              <div>• Ollama: http://localhost:11434 (Auto processes JSON schemas)</div>
              <div>• llama.cpp: http://localhost:8080 (Very fast raw completion)</div>
              <div>• OpenAI Local API: http://localhost:1234 (LM Studio, LocalAI)</div>
            </div>
          </div>

          <form onSubmit={handleSaveLlm} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Active Service Provider</label>
              <select
                value={provider}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setProvider(val);
                  if (val === 'gemini') {
                    setEndpoint('');
                    setModel('gemini-3.5-flash');
                  } else if (val === 'ollama') {
                    setEndpoint('http://localhost:11434');
                    setModel('llama3');
                  } else if (val === 'llamacpp') {
                    setEndpoint('http://localhost:8080');
                    setModel('model');
                  } else if (val === 'openai_compatible') {
                    setEndpoint('http://localhost:1234');
                    setModel('local-model');
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="gemini">Google Gemini API Fallback (Cloud Preview)</option>
                <option value="ollama">Ollama Server (Local Laptop)</option>
                <option value="llamacpp">llama.cpp Server (Local laptop)</option>
                <option value="openai_compatible">OpenAI-Compatible Local Host (LM Studio, etc)</option>
              </select>
            </div>

            {provider !== 'gemini' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-550 block mb-1 font-mono">Service Endpoint URL</label>
                  <input
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="e.g. http://localhost:11434"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-550 block mb-1 font-mono">Model Alias name (if required)</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. llama3, mistral, custom"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {provider === 'gemini' && (
              <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 text-xs leading-relaxed flex gap-2 font-sans shadow-inner">
                <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>
                  <strong>Cloud Fallback Active</strong>: In development, your app uses the pre-configured Gemini API key directly, bypassing local setup until you choose to export and run locally on your terminal!
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer bg-zinc-950 hover:bg-zinc-900 text-zinc-350 font-bold py-4 rounded-xl text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 border border-zinc-800 shadow"
            >
              {llmSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" /> Connection Parameters Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-zinc-500" /> Save LLM Host Configurations
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Dangerous/Data cleansing Utilities */}
      <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300">Data Management</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Wipe out all pre-loaded sample records and reset all diaries and weight logs to 0. This allows you to start entirely fresh using your actual, personal physical metrics.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (confirm("Are you sure you want to clear all your food logs and weight records? This cannot be undone.")) {
              await onClearAllLogs();
              alert("All log records have been cleared from the database.");
            }
          }}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/35 px-5 py-3 rounded-2xl text-[10px] uppercase font-bold tracking-wider transition cursor-pointer flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Wipe & Reset Logs
        </button>
      </div>
    </div>
  );
}
