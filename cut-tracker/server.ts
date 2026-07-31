/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  initDb,
  getUserProfiles,
  getUserProfile,
  saveUserProfile,
  deleteUserProfile,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  getFoodLogs,
  addFoodLog,
  deleteFoodLog,
  getLlmConfig,
  saveLlmConfig,
  clearAllLogs,
} from "./server-db";
import { estimateNutrition, askAiCoach, estimateNutritionFromImage } from "./server-llm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware (allowing up to 20mb for base64 photo logging payloads)
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize DB
  try {
    await initDb();
    console.log("SQLite Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize SQLite:", err);
  }

  // --- API Routes ---

  // User Profile Endpoints
  app.get("/api/profiles", async (req, res) => {
    try {
      const profiles = await getUserProfiles();
      res.json(profiles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await getUserProfile(req.params.id);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const user = req.body;
      if (!user.id || !user.name) {
        return res.status(400).json({ error: "Missing required profile fields (id, name)." });
      }
      await saveUserProfile(user);
      res.json({ success: true, profile: user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/profiles/:id", async (req, res) => {
    try {
      await deleteUserProfile(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Weight Log Endpoints
  app.get("/api/weights/:userId", async (req, res) => {
    try {
      const logs = await getWeightLogs(req.params.userId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/weights", async (req, res) => {
    try {
      const { userId, date, weight } = req.body;
      if (!userId || !date || weight === undefined) {
        return res.status(400).json({ error: "userId, date, and weight are required." });
      }
      await addWeightLog(userId, date, Number(weight));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/weights/:id", async (req, res) => {
    try {
      await deleteWeightLog(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Food Log Endpoints
  app.get("/api/foods/:userId", async (req, res) => {
    try {
      const logs = await getFoodLogs(req.params.userId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Parse food entry ONLY (does not save)
  app.post("/api/foods/parse", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ error: "description is required." });
      }
      const config = await getLlmConfig();
      const nutrition = await estimateNutrition(description, config);
      res.json(nutrition);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Identify and parse food from photos / camera snapshots
  app.post("/api/foods/parse-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "image (base64 string) is required." });
      }
      // sanitize base64 prefix if client sends it
      let base64Data = image;
      let detectedMime = mimeType || "image/jpeg";
      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          detectedMime = matches[1];
          base64Data = matches[2];
        }
      }
      const config = await getLlmConfig();
      const nutrition = await estimateNutritionFromImage(base64Data, detectedMime, config);
      res.json(nutrition);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Log food directly
  app.post("/api/foods", async (req, res) => {
    try {
      const { userId, date, description, calories, protein, carbs, fat, confidence } = req.body;
      if (!userId || !date || !description || calories === undefined) {
        return res.status(400).json({ error: "userId, date, description, and calories are required." });
      }
      const log = await addFoodLog(
        userId,
        date,
        description,
        Number(calories),
        Number(protein || 0),
        Number(carbs || 0),
        Number(fat || 0),
        Number(confidence ?? 1.0)
      );
      res.json({ success: true, log });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/foods/:id", async (req, res) => {
    try {
      await deleteFoodLog(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear all Logs for target profile
  app.post("/api/clear-logs/:userId", async (req, res) => {
    try {
      await clearAllLogs(req.params.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // LLM Config Endpoints
  app.get("/api/llm-config", async (req, res) => {
    try {
      const config = await getLlmConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/llm-config", async (req, res) => {
    try {
      const config = req.body;
      await saveLlmConfig(config);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Calorie / Weight Coach Endpoint
  app.post("/api/ai/coach", async (req, res) => {
    try {
      const { userId, query } = req.body;
      if (!userId || !query) {
        return res.status(400).json({ error: "userId and query are required." });
      }

      // Query core data
      const user = await getUserProfile(userId);
      if (!user) return res.status(404).json({ error: "Profile not found" });

      const weights = await getWeightLogs(userId);
      const foods = await getFoodLogs(userId);
      const config = await getLlmConfig();

      const answer = await askAiCoach(query, user, weights, foods, config);
      res.json({ answer });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", activePort: PORT });
  });

  // --- Vite Dev Middleware vs Static Server ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cut Tracker] Backend listening running on http://localhost:${PORT}`);
  });
}

startServer();
