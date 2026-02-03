// HELE FILEN ERSTATTER DIN GAMLE

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Switch } from "./components/ui/switch";
import { Separator } from "./components/ui/separator";

import {
  MapPin,
  Images,
  Newspaper,
  Users,
  Settings,
  Maximize2,
  Minimize2,
  HelpCircle,
  Cloud,
} from "lucide-react";

import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* -------------------- KONSTANTER -------------------- */

const LOCAL_KEY_PREFIX = "infoskjerm_config_v2";

const WEATHER_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.83&lon=10.82";

const SYMBOL_URL =
  "https://api.met.no/images/weathericons/svg/";

/* -------------------- DEFAULT CONFIG -------------------- */

const DEFAULT_CONFIG = {
  schoolName: "Furnes ungdomsskole",
  location: "Furnes, Ringsaker",

  imageUrlsText: "",

  announcementTitle: "Kunngjøringer",
  announcements: "",

  absenceTitle: "Fravær i dag",
  absence: "",

  quizTitle: "Dagens nøtt",
  quizText: "Hva går opp og ned uten å bevege seg?",

  carouselIntervalMs: 7000,
  newsEnabled: true,
};

/* -------------------- LOCAL STORAGE -------------------- */

function localKey(role) {
  return `${LOCAL_KEY_PREFIX}_${role}`;
}

function loadLocal(role) {
  try {
    const raw = localStorage.getItem(localKey(role));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(role, data) {
  localStorage.setItem(localKey(role), JSON.stringify(data));
}

/* -------------------- FIREBASE -------------------- */

async function saveToCloud(role, data) {
  await setDoc(doc(db, "configs", role), {
    ...data,
    _updatedAt: serverTimestamp(),
  });
}

async function loadFromCloud(role) {
  const snap = await getDoc(doc(db, "configs", role));
  if (!snap.exists()) throw new Error("Ingen skydata");
  return snap.data();
}

/* ========================================================= */

export default function SkoleInfoskjerm() {

  const [activeRole, setActiveRole] = useState("elev");

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draft, setDraft] = useState(DEFAULT_CONFIG);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState("");

  const [weatherNow, setWeatherNow] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");

  /* -------------------- CLOCK -------------------- */

  useEffect(() => {
    function update() {
      const now = new Date();

      setTimeString(
        now.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })
      );

      setDateString(
        now.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })
      );
    }

    update();
    const t = setInterval(update, 15000);
    return () => clearInterval(t);
  }, []);

  /* -------------------- LOAD LOCAL -------------------- */

  useEffect(() => {
    const stored = loadLocal(activeRole);
    if (stored) {
      setConfig(stored);
      setDraft(stored);
    }
  }, [activeRole]);

  /* -------------------- WEATHER -------------------- */

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch(WEATHER_URL, {
          headers: { "User-Agent": "infoskjerm" },
        });

        const data = await res.json();

        const ts = data.properties.timeseries;

        const now = ts[0].data.instant.details;
        const symbol =
          ts[0].data.next_1_hours?.summary?.symbol_code || "clearsky_day";

        setWeatherNow({
          temp: Math.round(now.air_temperature),
          symbol,
        });

        const next6 = ts.slice(0, 6).map((t) => ({
          time: t.time.substring(11, 16),
          temp: Math.round(t.data.instant.details.air_temperature),
          symbol:
            t.data.next_1_hours?.summary?.symbol_code ||
            "clearsky_day",
        }));

        setWeatherForecast(next6);

      } catch (e) {
        console.error("Weather error", e);
      }
    }

    loadWeather();
    const t = setInterval(loadWeather, 600000);
    return () => clearInterval(t);
  }, []);

  /* -------------------- CAROUSEL -------------------- */

  const imageUrls = (config.imageUrlsText || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!imageUrls.length) return;

    const t = setInterval(() => {
      setCurrentImageIndex((i) => (i + 1) % imageUrls.length);
    }, config.carouselIntervalMs);

    return () => clearInterval(t);
  }, [imageUrls.length, config.carouselIntervalMs]);

  /* ========================================================= */

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 to-emerald-50">

      {/* HEADER */}
      <header className="px-6 py-4 flex justify-between items-center">

        <div>
          <div className="text-3xl font-bold">{config.schoolName}</div>
          <div className="flex items-center text-lg text-slate-600">
            <MapPin className="w-5 h-5 mr-1" />
            {config.location}
          </div>
        </div>

        <div className="text-right">
          <div className="text-5xl font-bold">{timeString}</div>
          <div className="text-lg text-slate-600">{dateString}</div>
        </div>

        <Button onClick={() => setSettingsOpen(true)}>
          <Settings />
        </Button>

      </header>

      {/* MAIN */}
      <main className="flex-1 grid grid-rows-[2fr_1fr_1fr] gap-4 px-6">

        {/* IMAGE */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            {imageUrls.length && (
              <motion.img
                key={imageUrls[currentImageIndex]}
                src={imageUrls[currentImageIndex]}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </CardContent>
        </Card>

        {/* WEATHER + QUIZ */}
        <div className="grid grid-cols-2 gap-4">

          {/* WEATHER */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud /> Været
              </CardTitle>
            </CardHeader>

            <CardContent>

              {weatherNow && (
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={`${SYMBOL_URL}${weatherNow.symbol}.svg`}
                    className="w-20"
                  />
                  <div className="text-5xl font-bold">
                    {weatherNow.temp}°
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {weatherForecast.map((w, i) => (
                  <div key={i} className="text-center">
                    <div className="text-sm">{w.time}</div>
                    <img
                      src={`${SYMBOL_URL}${w.symbol}.svg`}
                      className="w-10 mx-auto"
                    />
                    <div className="font-semibold">{w.temp}°</div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>

          {/* QUIZ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle />
                {config.quizTitle}
              </CardTitle>
            </CardHeader>

            <CardContent className="text-xl whitespace-pre-line">
              {config.quizText}
            </CardContent>
          </Card>

        </div>

        {/* ANNOUNCEMENTS */}
        <Card>
          <CardHeader>
            <CardTitle>{config.announcementTitle}</CardTitle>
          </CardHeader>

          <CardContent className="text-xl whitespace-pre-line">
            {config.announcements}
          </CardContent>
        </Card>

      </main>

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4">Innstillinger</h2>

            <Textarea
              rows={4}
              value={draft.quizText}
              onChange={(e) =>
                setDraft({ ...draft, quizText: e.target.value })
              }
            />

            <div className="flex gap-2 mt-4">

              <Button
                onClick={() => {
                  setConfig(draft);
                  saveLocal(activeRole, draft);
                  setSettingsOpen(false);
                }}
              >
                Lagre lokalt
              </Button>

              <Button
                onClick={async () => {
                  await saveToCloud(activeRole, draft);
                  setStatus("Lagret i sky");
                }}
              >
                Lagre til sky
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  const cloud = await loadFromCloud(activeRole);
                  setDraft(cloud);
                  setConfig(cloud);
                }}
              >
                Hent fra sky
              </Button>

            </div>

            {status && <div className="mt-2">{status}</div>}

          </div>

        </div>
      )}

    </div>
  );
}
