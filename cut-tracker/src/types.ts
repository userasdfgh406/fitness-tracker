/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  height: number; // in cm
  weight: number; // starting path / current weight tracker
  goalWeight: number; // in kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  rateOfLoss: number; // desired rate of loss: kg per week (e.g. 0.25, 0.5, 1.0)
  maintenanceCalories: number;
  calorieTarget: number;
  proteinTarget: number;
  manualOverride: boolean; // manual override of target calculations
}

export interface WeightLog {
  id: number;
  userId: string;
  date: string; // YYYY-MM-DD string
  weight: number; // in kg
}

export interface FoodLog {
  id: number;
  userId: string;
  date: string; // YYYY-MM-DD string
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface LLMConfig {
  provider: 'gemini' | 'ollama' | 'llamacpp' | 'openai_compatible';
  endpoint: string;
  model: string;
}

export interface DailySummary {
  date: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  calorieTarget: number;
  proteinTarget: number;
  calorieDeficit: number; // maintenance - consumed
  weight: number | null; // actual weight logged if any
  weightMovingAvg: number | null; // 7 day moving avg If available
}

export interface WeeklyAnalysis {
  avgDailyCalories: number;
  avgDailyProtein: number;
  weeklyCalorieDeficit: number; // sum of daily deficits
  predictedFatLoss: number; // weeklyCalorieDeficit / 7700
  actualWeightChange: number; // latest moving avg - previous moving avg or similar scale diff
  difference: number; // predicted - actual
}

export interface AiCoachMessage {
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}
