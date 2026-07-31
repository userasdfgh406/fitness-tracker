# Cut Tracker 🔪🔥

Cut Tracker is a high-performance, private, full-stack biometric weight loss, calorie deficit, and macronutrient tracking application designed for local execution on your laptop. 

It features native support for local LLaMA model servers (such as **Ollama**, **llama.cpp**, or LM Studio) as well as **Google Gemini API** fallback to estimate calories, protein distributions, and carbs from natural language meal descriptions.

---

## 🚀 Quick Start (Running Locally)

To run Cut Tracker locally on your laptop, complete the following commands:

### 1. Clone & Dependencies Installation
Ensure you have **Node.js 18+** installed:
```bash
# Install NPM dependencies
npm install
```

### 2. Run the Development Server
```bash
# Starts Express backend and Vite middleware proxy
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 3. Build & Run for Production
```bash
# Bundles Vite frontend static assets and compiles Express backend via esbuild
npm run build

# Boots compiled CommonJS bundle
npm run start
```

---

## 🐳 Docker Deployment

To run containerized via Docker on your local laptop:

### Build Container:
```bash
docker build -t cut-tracker .
```

### Run Container:
```bash
docker run -d -p 3000:3000 --name cut_tracker_app cut-tracker
```
Access inside browser via `http://localhost:3000`. Your biometric database will be maintained inside `./cut_tracker.db` at the root container.

---

## 🧠 Local LLaMA Integrations (Ollama & llama.cpp)

Cut Tracker has a modular service layer allowing you to query local LLMs for parsing statements and generating AI Coach summaries.

### Option A: Ollama Setup (Recommended)
1. Run Ollama on your computer.
2. Pull your model of choice:
   ```bash
   ollama pull llama3
   ```
3. In **Cut Tracker > Configuration**:
   - Set **Service Provider** to `Ollama Server`.
   - Set **Service Endpoint** to `http://localhost:11434`.
   - Set **Model name** to `llama3` (or your pulled model).
4. Type `"3 eggs and 2 toast"` in the Diet Diaries tab — the LLM will provide instant estimates!

### Option B: llama.cpp Server
1. Download a GGUF model and run `llama-server`:
   ```bash
   ./llama-server -m your_model.gguf --port 8080 -c 2048
   ```
2. In **Cut Tracker > Configuration**:
   - Set **Service Provider** to `llama.cpp Server`.
   - Set **Service Endpoint** to `http://localhost:8080`.
3. Save configurations.

### Option C: OpenAI compatible / LM Studio
1. Launch LM Studio, toggle the local server active on port `1234` or custom.
2. Configure **Service Provider** to `OpenAI-Compatible Local Host` at `http://localhost:1234` inside the app settings.

---

## 📊 Biometric Science & Equations

- **BMR (Harris-Benedict Equation)**:
  - Male: `88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)`
  - Female: `447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)`
- **Maintenance Multipliers**:
  - Sedentary: `1.2`
  - Light Activity: `1.375`
  - Moderate Activity: `1.55`
  - Active: `1.725`
  - Extra Active: `1.9`
- **Lipid Energy Equilibrium Law**: 
  - Weight loss (kg) is computed via `Deficit / 7700`.
- **Smoothed Trendline (7-Day MA)**:
  - Weight trends are computed using rolling 7-day average limits to eliminate cellular water weight fluctuations, glycogen storage variance, and sodium shifts from daily weights.

---

## 🗄️ Database Architecture (SQLite)

Databases are managed entirely via SQLite promises internally in Node:
- `users`: biographical, maintenance thresholds, override specifications, deficit speeds.
- `weight_logs`: daily logged kilograms. Unique columns are set per user per date to prevent duplicates.
- `food_logs`: food descriptions, parsed calories, and protein weights.
- `llm_config`: persistent server model selections.
