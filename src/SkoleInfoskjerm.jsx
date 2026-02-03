import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Switch } from "./components/ui/switch";
import { Separator } from "./components/ui/separator";

import {
  Cloud,
  MapPin,
  Images,
  Newspaper,
  Users,
  Settings,
  Maximize2,
  Minimize2,
  HelpCircle,
} from "lucide-react";

import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* -------------------------------------------------- */
/* KONSTANTER */
/* -------------------------------------------------- */

const NRK_RSS_URL =
  "https://api.allorigins.win/raw?url=https://www.nrk.no/nyheter/siste.rss";

/* Furnes koordinater */
const WEATHER_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.83&lon=10.82";

/* -------------------------------------------------- */
/* DEFAULT CONFIG */
/* -------------------------------------------------- */

const DEFAULT_CONFIG = {
  schoolName: "Furnes ungdomsskole",
  location: "Furnes, Ringsaker",

  imageUrlsText: "",

  announcementTitle: "Kunngjøringer",
  announcements: "",

  absenceTitle: "Fravær i dag",
  absence: "",

  quizTitle: "Dagens nøtt",
  quizText: "Hva er verdens lengste elv?",

  carouselIntervalMs: 7000,
  newsEnabled: true,
};

/* -------------------------------------------------- */
/* HOVEDKOMPONENT */
/* -------------------------------------------------- */

export default function SkoleInfoskjerm() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draft, setDraft] = useState(DEFAULT_CONFIG);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tickerText, setTickerText] = useState("");

  const [weather, setWeather] = useState(null);

  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  /* -------------------------------------------------- */
  /* KLOKKE */
  /* -------------------------------------------------- */

  useEffect(() => {
    function updateTime() {
      const now = new Date();

      setTimeString(
        now.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      setDateString(
        now.toLocaleDateString("nb-NO", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    }

    updateTime();
    const t = setInterval(updateTime, 15000);
    return () => clearInterval(t);
  }, []);

  /* -------------------------------------------------- */
  /* BILDEKARUSELL */
  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /* VÆR */
  /* -------------------------------------------------- */

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch(WEATHER_URL, {
          headers: { "User-Agent": "infoskjerm" },
        });

        const data = await res.json();

        const now =
          data.properties.timeseries[0].data.instant.details;

        setWeather({
          temp: Math.round(now.air_temperature),
          wind: Math.round(now.wind_speed),
        });
      } catch (e) {
        console.error("Vær-feil", e);
      }
    }

    loadWeather();
    const t = setInterval(loadWeather, 600000);

    return () => clearInterval(t);
  }, []);

  /* -------------------------------------------------- */
  /* NRK */
  /* -------------------------------------------------- */

  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch(NRK_RSS_URL);
        const xml = await res.text();

        const xmlDoc = new DOMParser().parseFromString(
          xml,
          "text/xml"
        );

        const titles = Array.from(
          xmlDoc.querySelectorAll("item > title")
        ).map((t) => t.textContent);

        setTickerText("NRK: " + titles.slice(0, 20).join(" • "));
      } catch {
        setTickerText("Kunne ikke hente NRK-nyheter");
      }
    }

    loadNews();
    const t = setInterval(loadNews, 600000);

    return () => clearInterval(t);
  }, []);

  /* -------------------------------------------------- */
  /* RENDER */
  /* -------------------------------------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 to-emerald-50">

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">
            {config.schoolName}
          </h1>
          <p className="text-lg text-slate-600">
            {config.location}
          </p>
        </div>

        <div className="text-right">
          <div className="text-6xl font-bold">
            {timeString}
          </div>
          <div className="text-lg text-slate-600">
            {dateString}
          </div>
        </div>
      </header>

      {/* MAIN – STÅENDE GRID */}
      <main className="flex-1 grid grid-rows-[2fr_1fr_1fr] gap-4 px-6">

        {/* BILDER */}
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

        {/* MIDTSEKSJON */}
        <div className="grid grid-cols-2 gap-4">

          {/* VÆR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <Cloud /> Været
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {weather && (
                <>
                  <div className="text-6xl font-bold">
                    {weather.temp}°
                  </div>
                  <div className="text-xl">
                    Vind {weather.wind} m/s
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* QUIZ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <HelpCircle /> {config.quizTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl whitespace-pre-line">
              {config.quizText}
            </CardContent>
          </Card>
        </div>

        {/* KUNNGJØRINGER */}
        <Card>
          <CardHeader>
            <CardTitle>
              {config.announcementTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl whitespace-pre-line">
            {config.announcements}
          </CardContent>
        </Card>
      </main>

      {/* NRK TICKER */}
      {config.newsEnabled && (
        <div className="h-12 bg-blue-600 text-white flex items-center px-4 overflow-hidden">
          <motion.div
            className="whitespace-nowrap text-xl"
            animate={{ x: ["100%", "-100%"] }}
            transition={{
              repeat: Infinity,
              duration: 120,
              ease: "linear",
            }}
          >
            {tickerText}
          </motion.div>
        </div>
      )}
    </div>
  );
}
