/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, WeightLog, FoodLog, DailySummary, WeeklyAnalysis } from "./types";

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary (Little/no exercise)",
  lightly_active: "Lightly Active (1-3 days/wk)",
  moderately_active: "Moderately Active (3-5 days/wk)",
  very_active: "Very Active (6-7 days/wk)",
  extra_active: "Extra Active (Hard physical job)",
};

/**
 * Calculates Basal Metabolic Rate using Harris-Benedict revised formula
 */
export function calculateBMR(age: number, sex: 'male' | 'female' | 'other', height: number, weight: number): number {
  if (sex === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else if (sex === 'female') {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  } else {
    // Average of male and female for gender neutral or other profile definitions
    const maleBmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    const femaleBmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    return (maleBmr + femaleBmr) / 2;
  }
}

/**
 * Calculates Maintenance calories based on BMR and activity multiplier
 */
export function calculateMaintenance(bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calculates targets based on weight profile and cut speed. Includes protein allocation (2.0g per kg target).
 */
export function calculateCalorieAndProteinTarget(
  maintenance: number,
  weight: number,
  rateOfLoss: number
): { calorieTarget: number; proteinTarget: number } {
  // 1 kg of fat approx 7700 kcal
  // Daily calorie deficit = (rateOfLoss * 7700) / 7
  const dailyDeficit = (rateOfLoss * 7700) / 7;
  const calorieTarget = Math.max(1200, Math.round(maintenance - dailyDeficit));

  // Protein requirement: 2g/kg is highly suited during calorie restriction to maintain muscle mass
  const proteinTarget = Math.round(Math.max(100, Math.min(250, weight * 2.0)));

  return { calorieTarget, proteinTarget };
}

/**
 * Yields the date strings (YYYY-MM-DD) for a range of trailing N days
 */
export function getTrailingDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Processes daily aggregations including moving averages of weights
 */
export function buildDailySummaries(
  dates: string[],
  weightLogs: WeightLog[],
  foodLogs: FoodLog[],
  profile: UserProfile
): DailySummary[] {
  // Sort logs by date ascending
  const weightsByDate: Record<string, number> = {};
  weightLogs.forEach(w => {
    weightsByDate[w.date] = w.weight;
  });

  const foodsByDate: Record<string, { cal: number; prot: number; carb: number; fat: number }> = {};
  foodLogs.forEach(f => {
    if (!foodsByDate[f.date]) {
      foodsByDate[f.date] = { cal: 0, prot: 0, carb: 0, fat: 0 };
    }
    foodsByDate[f.date].cal += f.calories;
    foodsByDate[f.date].prot += f.protein;
    foodsByDate[f.date].carb += f.carbs;
    foodsByDate[f.date].fat += f.fat;
  });

  return dates.map(date => {
    const weight = weightsByDate[date] || null;

    // Calulate 7-day moving weight average for the date
    let weightMovingAvg: number | null = null;
    const dateObj = new Date(date);
    let movingSum = 0;
    let movingCount = 0;
    for (let k = 0; k < 7; k++) {
      const pastDate = new Date(dateObj);
      pastDate.setDate(dateObj.getDate() - k);
      const pastStr = pastDate.toISOString().split('T')[0];
      const pastW = weightsByDate[pastStr];
      if (pastW) {
        movingSum += pastW;
        movingCount++;
      }
    }
    if (movingCount > 0) {
      weightMovingAvg = Number((movingSum / movingCount).toFixed(2));
    }

    const foodInfo = foodsByDate[date] || { cal: 0, prot: 0, carb: 0, fat: 0 };
    const deficit = profile.maintenanceCalories - foodInfo.cal;

    return {
      date,
      caloriesConsumed: foodInfo.cal,
      proteinConsumed: foodInfo.prot,
      carbsConsumed: foodInfo.carb,
      fatConsumed: foodInfo.fat,
      calorieTarget: profile.calorieTarget,
      proteinTarget: profile.proteinTarget,
      calorieDeficit: deficit,
      weight,
      weightMovingAvg
    };
  });
}

/**
 * Formulates the weekly calculations
 */
export function calculateWeeklyAnalysis(
  summaries: DailySummary[],
  weightLogs: WeightLog[]
): WeeklyAnalysis {
  const count = summaries.length;
  if (count === 0) {
    return {
      avgDailyCalories: 0,
      avgDailyProtein: 0,
      weeklyCalorieDeficit: 0,
      predictedFatLoss: 0,
      actualWeightChange: 0,
      difference: 0
    };
  }

  // Averages
  const totalCal = summaries.reduce((acc, s) => acc + s.caloriesConsumed, 0);
  const totalProt = summaries.reduce((acc, s) => acc + s.proteinConsumed, 0);
  const totalDeficit = summaries.reduce((acc, s) => acc + s.calorieDeficit, 0);

  const avgDailyCalories = Math.round(totalCal / count);
  const avgDailyProtein = Math.round(totalProt / count);

  // 1 kg of fat is approximately 7700 kcal of deficit
  const predictedFatLoss = Number((totalDeficit / 7700).toFixed(3));

  // Actual scale change in last 7 days or logs span
  let actualWeightChange = 0;
  if (weightLogs.length >= 2) {
    // Diff between oldest and newest moving averages (or closest logged weights)
    const sortedWeights = [...weightLogs].sort((a,b) => a.date.localeCompare(b.date));
    const oldest = sortedWeights[0].weight;
    const newest = sortedWeights[sortedWeights.length - 1].weight;
    actualWeightChange = Number((newest - oldest).toFixed(2));
  }

  return {
    avgDailyCalories,
    avgDailyProtein,
    weeklyCalorieDeficit: Math.round(totalDeficit),
    predictedFatLoss,
    actualWeightChange,
    difference: Number((predictedFatLoss - Math.abs(actualWeightChange)).toFixed(2))
  };
}

/**
 * Export daily/weekly log to CSV helper
 */
export function convertLogsToCsv(foodLogs: FoodLog[], weightLogs: WeightLog[]): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Type,Date,Description/Weight,Calories,Protein(g),Carbs(g),Fat(g),Confidence\n";

  // Add weight logs
  weightLogs.forEach(w => {
    csvContent += `Weight,${w.date},${w.weight} kg,,,,,\n`;
  });

  // Add food logs
  foodLogs.forEach(f => {
    const safeDesc = f.description.replace(/,/g, " ");
    csvContent += `Food,${f.date},${safeDesc},${f.calories},${f.protein},${f.carbs},${f.fat},${f.confidence}\n`;
  });

  return encodeURI(csvContent);
}

/**
 * Calculate Streaks in Logging! (consecutive days of logged food or weights)
 */
export function calculateStreak(foodLogs: FoodLog[], weightLogs: WeightLog[]): number {
  const loggedDates = new Set<string>();
  foodLogs.forEach(f => loggedDates.add(f.date));
  weightLogs.forEach(w => loggedDates.add(w.date));

  if (loggedDates.size === 0) return 0;

  let streak = 0;
  const checkDate = new Date(); // Start checking from today
  
  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (loggedDates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today has no logs, it might be early. Check yesterday.
      if (streak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yStr = checkDate.toISOString().split('T')[0];
        if (loggedDates.has(yStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  return streak;
}
