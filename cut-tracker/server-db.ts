/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { UserProfile, WeightLog, FoodLog, LLMConfig } from './src/types';

const DB_FILE = path.join(process.cwd(), 'cut_tracker_db.json');

interface DbSchema {
  users: UserProfile[];
  weightLogs: WeightLog[];
  foodLogs: FoodLog[];
  llmConfig: LLMConfig;
}

let dbCache: DbSchema | null = null;

async function loadDb(): Promise<DbSchema> {
  if (dbCache) return dbCache;
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    dbCache = JSON.parse(data);
    return dbCache!;
  } catch (err: any) {
    dbCache = {
      users: [],
      weightLogs: [],
      foodLogs: [],
      llmConfig: { provider: 'gemini', endpoint: 'https://api.openai.com/v1', model: 'default' }
    };
    return dbCache;
  }
}

async function saveDb(): Promise<void> {
  if (!dbCache) return;
  const tempFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(dbCache, null, 2), 'utf-8');
  await fs.rename(tempFile, DB_FILE);
}

export async function initDb() {
  const db = await loadDb();
  let changed = false;

  if (db.users.length === 0) {
    const defaultUser: UserProfile = {
      id: 'default-user',
      name: 'Amritesh',
      age: 26,
      sex: 'male',
      height: 180,
      weight: 85.0,
      goalWeight: 75.0,
      activityLevel: 'moderately_active',
      rateOfLoss: 0.5,
      maintenanceCalories: 2605, // default
      calorieTarget: 2100, // deficit of 500
      proteinTarget: 160,
      manualOverride: false,
    };
    db.users.push(defaultUser);
    changed = true;
  }

  if (!db.llmConfig || !db.llmConfig.provider) {
    db.llmConfig = {
      provider: 'gemini',
      endpoint: 'https://api.openai.com/v1',
      model: 'default'
    };
    changed = true;
  }

  if (changed) {
    await saveDb();
  }
}

export async function clearAllLogs(userId: string): Promise<void> {
  const db = await loadDb();
  db.weightLogs = db.weightLogs.filter(w => w.userId !== userId);
  db.foodLogs = db.foodLogs.filter(f => f.userId !== userId);
  await saveDb();
}

// User Profile CRUD operations
export async function getUserProfiles(): Promise<UserProfile[]> {
  const db = await loadDb();
  return db.users;
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const db = await loadDb();
  const user = db.users.find(u => u.id === id);
  return user || null;
}

export async function saveUserProfile(user: UserProfile): Promise<void> {
  const db = await loadDb();
  const idx = db.users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    db.users[idx] = user;
  } else {
    db.users.push(user);
  }
  await saveDb();
}

export async function deleteUserProfile(id: string): Promise<void> {
  const db = await loadDb();
  db.users = db.users.filter(u => u.id !== id);
  db.weightLogs = db.weightLogs.filter(w => w.userId !== id);
  db.foodLogs = db.foodLogs.filter(f => f.userId !== id);
  await saveDb();
}

// Weight log CRUD-operations
export async function getWeightLogs(userId: string): Promise<WeightLog[]> {
  const db = await loadDb();
  return db.weightLogs
    .filter(w => w.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addWeightLog(userId: string, date: string, weight: number): Promise<void> {
  const db = await loadDb();
  const idx = db.weightLogs.findIndex(w => w.userId === userId && w.date === date);
  if (idx !== -1) {
    db.weightLogs[idx].weight = weight;
  } else {
    const maxId = db.weightLogs.reduce((max, w) => w.id > max ? w.id : max, 0);
    db.weightLogs.push({
      id: maxId + 1,
      userId,
      date,
      weight
    });
  }
  await saveDb();
}

export async function deleteWeightLog(id: number): Promise<void> {
  const db = await loadDb();
  db.weightLogs = db.weightLogs.filter(w => w.id !== id);
  await saveDb();
}

// Food log CRUD-operations
export async function getFoodLogs(userId: string): Promise<FoodLog[]> {
  const db = await loadDb();
  return db.foodLogs
    .filter(f => f.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

export async function addFoodLog(
  userId: string,
  date: string,
  description: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  confidence: number
): Promise<FoodLog> {
  const db = await loadDb();
  const maxId = db.foodLogs.reduce((max, f) => f.id > max ? f.id : max, 0);
  const newLog: FoodLog = {
    id: maxId + 1,
    userId,
    date,
    description,
    calories,
    protein,
    carbs,
    fat,
    confidence
  };
  db.foodLogs.push(newLog);
  await saveDb();
  return newLog;
}

export async function deleteFoodLog(id: number): Promise<void> {
  const db = await loadDb();
  db.foodLogs = db.foodLogs.filter(f => f.id !== id);
  await saveDb();
}

// LLM settings Persistent Store
export async function getLlmConfig(): Promise<LLMConfig> {
  const db = await loadDb();
  return db.llmConfig;
}

export async function saveLlmConfig(config: LLMConfig): Promise<void> {
  const db = await loadDb();
  db.llmConfig = config;
  await saveDb();
}
