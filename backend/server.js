// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

app.use(cors());
app.use(express.json()); // Parse JSON request bodies

const PORT = process.env.PORT || 5000;
const MAP_KEY = process.env.MAP_KEY;

if (!MAP_KEY) {
  console.warn("Warning: NASA FIRMS MAP_KEY is not set in .env");
}

const FIRMS_BASE_URL_AREA = "https://firms.modaps.eosdis.nasa.gov/api/area/json";
const FIRMS_BASE_URL_COUNTRY = "https://firms.modaps.eosdis.nasa.gov/api/india/json";

// --- Endpoint 1: Fire data by bounding box ---
app.get('/api/fires', async (req, res) => {
  const { minLon, minLat, maxLon, maxLat, days } = req.query;

  if (![minLon, minLat, maxLon, maxLat].every(x => x !== undefined)) {
    return res.status(400).json({ error: "Missing bounding box parameters (minLon, minLat, maxLon, maxLat)" });
  }

  const bbox = [minLon, minLat, maxLon, maxLat].join(',');
  const daysParam = days || '1';
  const url = `${FIRMS_BASE_URL_AREA}/${MAP_KEY}/MODIS_NRT/${bbox}/${daysParam}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("FIRMS API bbox error:", errorText);
      return res.status(500).json({ error: "FIRMS API error", details: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching fires by bbox:", error);
    res.status(500).json({ error: "Server error fetching fire data." });
  }
});

// --- Endpoint 2: Fire data for India ---
app.get('/api/fires/india', async (req, res) => {
  const daysParam = req.query.days || '7';
  const url = `${FIRMS_BASE_URL_COUNTRY}/${MAP_KEY}/VIIRS_SNPP_NRT/IND/${daysParam}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("FIRMS API India error:", errorText);
      return res.status(500).json({ error: "FIRMS API error (India)", details: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching fires for India:", error);
    res.status(500).json({ error: "Server error fetching fire data for India." });
  }
});

// --- Endpoint 3: Fire Risk Prediction Graph Data ---
app.post('/api/predict', (req, res) => {
  const { days, temp, humidity, wind } = req.body;

  // Validate and sanitize inputs
  const numDays = Math.max(1, Math.min(30, parseInt(days, 10) || 7));
  const avgTemp = parseFloat(temp) || 35;
  const avgHumidity = parseFloat(humidity) || 30;
  const avgWind = parseFloat(wind) || 12;

  const predictedRisk = [];
  const labels = [];

  for (let i = 1; i <= numDays; i++) {
    // Dummy formula for fire risk prediction:
    let baseRisk = 10;
    let risk = baseRisk
      + ((avgTemp - 25) * 1.8)
      - (avgHumidity * 0.23)
      + (avgWind * 0.8)
      + Math.pow(i, 1.1);
    risk = Math.round(Math.max(0, Math.min(100, risk))); // Clamp between 0 and 100%
    predictedRisk.push(risk);
    labels.push(`Day ${i}`);
  }

  res.json({ labels, risk: predictedRisk });
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
