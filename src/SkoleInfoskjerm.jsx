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
} from "lucide-react";

import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// --------------------------------------------------
// KONSTANTER / HJELPEFUNKSJONER
// --------------------------------------------------

const LOCAL_KEY_PREFIX = "infoskjerm_config_v1";

const NRK_RSS_URL =
 "https://api.allorigins.win/raw?url=https://www.nrk.no/toppsaker.rss";

function getInitialRole() {
  if (typeof window === "undefined") return "elev";
  const params = new URLSearchParams(window.location.search);
  const r = params.get("role");
  if (r === "laerer" || r === "lærer") return "laerer";
  return "elev";
}

function getInitialMode() {
  if (typeof window === "undefined") return "admin";
  const params = new URLSearchParams(window.location.search);
  const m = params.get("mode");
  return m === "view" ? "view" : "admin";
}

function localKeyForRole(role) {
  return `${LOCAL_KEY_PREFIX}_${role}`;
}

function loadLocalConfig(role) {
  try {
    const raw = localStorage.getItem(localKeyForRole(role));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Kunne ikke lese localStorage", e);
    return null;
  }
}

function saveLocalConfig(role, cfg) {
  try {
    localStorage.setItem(localKeyForRole(role), JSON.stringify(cfg));
  } catch (e) {
    console.error("Kunne ikke lagre til localStorage", e);
  }
}

function stripHeavyFields(data) {
  return { ...(data || {}) };
}

async function saveToCloud(role, data) {
  const safe = stripHeavyFields(data);
  const ref = doc(db, "configs", role); // docs: elev, laerer
  await setDoc(ref, {
    ...safe,
    _updatedAt: serverTimestamp(),
  });
}

async function loadFromCloud(role) {
  const ref = doc(db, "configs", role);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Ingen sky-data funnet for rolle: " + role);
  }
  return snap.data();
}
// -------- Hent NRK-nyheter --------
async function fetchNRKNewsTitles() {
  const res = await fetch(NRK_RSS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const xml = await res.text();
  const xmlDoc = new DOMParser().parseFromString(xml, "text/xml");

  const titles = Array.from(xmlDoc.querySelectorAll("item > title"))
    .map((t) => t.textContent?.trim())
    .filter(Boolean);

  return titles.slice(0, 20);
}

// NYTT START: Hent værdata fra Yr/Met
async function fetchWeather(location) {
  try {
    const res = await fetch(
      "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.828&lon=10.841",
      { headers: { "User-Agent": "infoskjerm/1.0" } }
    );
    if (!res.ok) throw new Error("Feil ved henting av vær");
    const data = await res.json();
    const now = new Date();
    const instant = data.properties.timeseries.find(
      ts => new Date(ts.time) >= now
    );
    const temp = instant?.data.instant.details.air_temperature;
    const symbol = instant?.data.next_1_hours?.summary.symbol_code;
    return { temp, symbol };
  } catch (e) {
    console.error(e);
    return null;
  }
}
// NYTT SLUTT
const DEFAULT_CONFIG = {
  schoolName: "Furnes ungdomsskole",
  location: "Furnes, Ringsaker",
  imageUrlsText:
    "https://bilder.tine.no/api/v3/images/edda-article/96d9e875-fc03-46a2-8fde-3bfb03f26c7b.jpg",
  announcementTitle: "Kunngjøringer",
  announcements:
    "• Velkommen til FUSK!\n• Foreldremøte torsdag kl. 18.00 i aulaen.\n• Skolebiblioteket holder åpent hver dag storefri.",
  absenceTitle: "Fravær i dag",
  absence:
    "• Lærer: Kari Nordmann (8B)\n• Assistent: Per Hansen (2A)",
  carouselIntervalMs: 7000,
  newsEnabled: true,
  // NYTT START: Vær og quiz/gåte/vits
weatherEnabled: true,
weatherLocation: "Furnes, Ringsaker",
quizTitle: "Quiz / Gåte / Vits",
quizContent: "Hva heter Norges høyeste fjell? – Galdhøpiggen",
// NYTT SLUTT
};

// --------------------------------------------------
// HOVEDKOMPONENT
// --------------------------------------------------

export default function SkoleInfoskjerm() {
  const [viewerRole] = useState(getInitialRole);   // hvilken rolle denne URL-en “viser” som standard
  const [mode] = useState(getInitialMode);         // admin eller view
  const [activeRole, setActiveRole] = useState(viewerRole); // hvilken rolle du redigerer / forhåndsviser

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draft, setDraft] = useState(DEFAULT_CONFIG);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");

  const [tickerText, setTickerText] = useState(
    "NRK: Laster siste nyheter…"
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);
  // NYTT START: State for værdata
const [weatherData, setWeatherData] = useState(null);
// NYTT SLUTT

  // -------- Klokke --------
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
          year: "numeric",
        })
      );
    }
    updateTime();
    const t = setInterval(updateTime, 15000);
    return () => clearInterval(t);
  }, []);

  // -------- Hent lokal config for viewerRole ved mount --------
  useEffect(() => {
    const stored = loadLocalConfig(viewerRole);
    if (stored) {
      setConfig(stored);
      setDraft(stored);
    } else {
      setConfig(DEFAULT_CONFIG);
      setDraft(DEFAULT_CONFIG);
    }
  }, [viewerRole]);

  // -------- Bildekarusell --------
  const imageUrls = (config.imageUrlsText || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!imageUrls.length) return;
    const t = setInterval(() => {
      setCurrentImageIndex((i) => (i + 1) % imageUrls.length);
    }, config.carouselIntervalMs || 7000);
    return () => clearInterval(t);
  }, [imageUrls.length, config.carouselIntervalMs]);
// -------- NRK ticker --------
useEffect(() => {
  let alive = true;

  async function loadNews() {
    try {
      const titles = await fetchNRKNewsTitles();
      if (!alive) return;

      if (titles.length) {
        setTickerText("NRK: " + titles.join(" • "));
      } else {
        setTickerText("NRK: Ingen nyheter funnet");
      }
    } catch (e) {
      console.error("NRK-feil:", e);
      if (!alive) return;
      setTickerText("NRK: Nyheter midlertidig utilgjengelig");
    }
  }

  loadNews();
  const t = setInterval(loadNews, 10 * 60 * 1000);

  return () => {
    alive = false;
    clearInterval(t);
  };
}, []);
  
// NYTT START: Hent værdata hver 15. min
useEffect(() => {
  let alive = true;
  async function loadWeather() {
    try {
      if (!config.weatherEnabled) return;
      const data = await fetchWeather(config.weatherLocation);
      if (!alive) return;
      setWeatherData(data);
    } catch (e) {
      console.error("Feil ved henting av vær", e);
      setWeatherData(null);
    }
  }
  loadWeather();
  const t = setInterval(loadWeather, 15 * 60 * 1000);
  return () => { alive = false; clearInterval(t); };
}, [config.weatherEnabled, config.weatherLocation]);
// NYTT SLUTT
  // -------- Fullskjerm-håndtering --------
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // -------- Auto-gjem musepeker etter 10s --------
  useEffect(() => {
    let timeoutId;

    function resetHideCursor() {
      setHideCursor(false);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setHideCursor(true);
      }, 10000); // 10 sekunder
    }

    resetHideCursor();

    window.addEventListener("mousemove", resetHideCursor);
    window.addEventListener("touchstart", resetHideCursor);

    return () => {
      window.removeEventListener("mousemove", resetHideCursor);
      window.removeEventListener("touchstart", resetHideCursor);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // -------- Lagre lokalt for aktiv rolle --------
  function handleSaveLocal() {
    setConfig(draft);
    saveLocalConfig(activeRole, draft);
    setStatus("✅ Lagret lokalt for " + activeRole);
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  const isAdmin = mode === "admin";
  const effectiveRole = activeRole; // det vi forhåndsviser (på view-skjerm = viewerRole)

  return (
    <div
      className="relative min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 text-slate-900 flex flex-col"
      style={{ cursor: hideCursor ? "none" : "default" }}
    >
      {/* HEADER */}
      <header className="px-6 py-4 flex items-center justify-between bg-sky-50/60 backdrop-blur border-b border-sky-100">
        <div>
          <div className="text-2xl font-semibold">
            {config.schoolName}
          </div>
          <div className="flex items-center text-sm text-slate-600 gap-1">
            <MapPin className="w-4 h-4" />
            <span>{config.location}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Visning:{" "}
            {effectiveRole === "laerer" ? "Lærerskjerm" : "Elevskjerm"}
            {isAdmin && " (admin)"}
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">
            {timeString}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {dateString}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullskjerm-knapp */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              isFullscreen ? exitFullscreen() : enterFullscreen();
            }}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          {/* Innstillinger-knapp kun i admin-modus */}
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setDraft(config);
                setStatus("");
                setSettingsOpen(true);
              }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

     {/* MAIN: Stående layout */}
<main className="flex-1 flex flex-col gap-4 px-6 py-4 overflow-hidden">
  {/* 1️⃣ Bildekarusell øverst */}
  <Card className="h-[40vh] w-full overflow-hidden">
    <CardContent className="p-0 h-full">
      {imageUrls.length ? (
        <motion.img
          key={imageUrls[currentImageIndex]}
          src={imageUrls[currentImageIndex]}
          alt=""
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400">
          Ingen bilder – legg til i innstillinger.
        </div>
      )}
    </CardContent>
  </Card>

  {/* 2️⃣ Vær + Quiz/Gåte/Vits */}
  <div className="flex gap-4">
    {config.weatherEnabled && (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="w-4 h-4" /> Vær
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {weatherData ? `${weatherData.temp}°C, ${weatherData.symbol}` : "Laster vær…"}
        </CardContent>
      </Card>
    )}

    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {config.quizTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm whitespace-pre-line">
        {config.quizContent}
      </CardContent>
    </Card>
  </div>

  {/* 3️⃣ Kunngjøringer */}
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Newspaper className="w-4 h-4" /> {config.announcementTitle}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm whitespace-pre-line">
      {config.announcements}
    </CardContent>
  </Card>
</main>

{/* 4️⃣ NRK-TICKER nederst */}
{config.newsEnabled && tickerText && (
  <div className="h-10 bg-blue-600 text-white flex items-center overflow-hidden px-4">
    <Newspaper className="w-4 h-4 mr-2 flex-shrink-0" />
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="whitespace-nowrap"
        animate={{ x: ["100%", "-100%"] }}
        transition={{ repeat: Infinity, duration: 110, ease: "linear" }}
      >
        {tickerText}
      </motion.div>
    </div>
  </div>
)}

      {/* INNSTILLINGER-MODAL (kun admin) */}
      {isAdmin && settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Innstillinger</h2>
              <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                Lukk
              </Button>
            </div>

            <div className="space-y-6">
              {/* Velg hvilken skjerm du redigerer */}
              <div>
                <label className="text-sm font-medium">
                  Rediger skjerm
                </label>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={activeRole === "elev" ? "default" : "outline"}
                    onClick={() => {
                      setActiveRole("elev");
                      const stored = loadLocalConfig("elev");
                      if (stored) {
                        setConfig(stored);
                        setDraft(stored);
                        setStatus("Redigerer elevskjerm (lokal data)");
                      } else {
                        setConfig(DEFAULT_CONFIG);
                        setDraft(DEFAULT_CONFIG);
                        setStatus("Redigerer elevskjerm (standardinnhold)");
                      }
                    }}
                  >
                    Elevskjerm
                  </Button>
                  <Button
                    type="button"
                    variant={activeRole === "laerer" ? "default" : "outline"}
                    onClick={() => {
                      setActiveRole("laerer");
                      const stored = loadLocalConfig("laerer");
                      if (stored) {
                        setConfig(stored);
                        setDraft(stored);
                        setStatus("Redigerer lærerskjerm (lokal data)");
                      } else {
                        setConfig(DEFAULT_CONFIG);
                        setDraft(DEFAULT_CONFIG);
                        setStatus("Redigerer lærerskjerm (standardinnhold)");
                      }
                    }}
                  >
                    Lærerskjerm
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Dette styrer hvilken skjerm (elev/lærer) du redigerer og forhåndsviser nå.
                </p>
              </div>

              <Separator />

              {/* Skoleinfo */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Skolens navn</label>
                  <Input
                    value={draft.schoolName}
                    onChange={(e) =>
                      setDraft({ ...draft, schoolName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sted</label>
                  <Input
                    value={draft.location}
                    onChange={(e) =>
                      setDraft({ ...draft, location: e.target.value })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Bildekarusell */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  <div className="font-medium">Bildekarusell</div>
                </div>
                <p className="text-xs text-slate-600">
                  Lim inn én bildeadresse (URL) per linje.
                </p>
                <Textarea
                  rows={5}
                  value={draft.imageUrlsText}
                  onChange={(e) =>
                    setDraft({ ...draft, imageUrlsText: e.target.value })
                  }
                />
                <div className="flex items-center gap-2 text-sm">
                  <span>Bytt bilde hvert</span>
                  <Input
                    type="number"
                    className="w-24"
                    value={draft.carouselIntervalMs}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        carouselIntervalMs: Number(e.target.value) || 7000,
                      })
                    }
                  />
                  <span>ms (1000 ms = 1 sekund)</span>
                </div>
              </div>

              {/* NYTT START: Vær */}
<Separator />
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Cloud className="w-4 h-4" />
    <div className="font-medium">Vær (Furnes)</div>
  </div>
  <div className="flex items-center gap-2">
    <span>Vis værkort:</span>
    <Switch
      checked={draft.weatherEnabled}
      onCheckedChange={(v) => setDraft({ ...draft, weatherEnabled: v })}
    />
  </div>
  <div>
    <label className="text-sm font-medium">Sted (for API)</label>
    <Input
      value={draft.weatherLocation}
      onChange={(e) => setDraft({ ...draft, weatherLocation: e.target.value })}
    />
  </div>
</div>
// NYTT SLUTT
              {/* NYTT START: Quiz / Gåte / Vits */}
<Separator />
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <div className="font-medium">Quiz / Gåte / Vits</div>
  </div>
  <div>
    <label className="text-sm font-medium">Tittel</label>
    <Input
      value={draft.quizTitle}
      onChange={(e) => setDraft({ ...draft, quizTitle: e.target.value })}
    />
  </div>
  <div>
    <label className="text-sm font-medium">Innhold</label>
    <Textarea
      rows={4}
      value={draft.quizContent}
      onChange={(e) => setDraft({ ...draft, quizContent: e.target.value })}
    />
  </div>
</div>
// NYTT SLUTT
              <Separator />

              {/* Kunngjøringer */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4" />
                  <div className="font-medium">Kunngjøringer</div>
                </div>
                <Input
                  className="mb-1"
                  value={draft.announcementTitle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      announcementTitle: e.target.value,
                    })
                  }
                />
                <Textarea
                  rows={5}
                  value={draft.announcements}
                  onChange={(e) =>
                    setDraft({ ...draft, announcements: e.target.value })
                  }
                />
              </div>

              <Separator />

              {/* Fravær – har effekt bare på lærerskjermen */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <div className="font-medium">Fravær i dag (vises kun på lærerskjerm)</div>
                </div>
                <Input
                  className="mb-1"
                  value={draft.absenceTitle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      absenceTitle: e.target.value,
                    })
                  }
                />
                <Textarea
                  rows={4}
                  value={draft.absence}
                  onChange={(e) =>
                    setDraft({ ...draft, absence: e.target.value })
                  }
                />
              </div>

              <Separator />

              {/* Sky */}
              <div className="space-y-2">
                <div className="font-medium">Sky (rolle: {activeRole})</div>
                <div className="flex gap-2">
                  {/* LAGRE TIL SKY + TA I BRUK MED EN GANG */}
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        await saveToCloud(activeRole, draft);
                        setConfig(draft);
                        saveLocalConfig(activeRole, draft);
                        setStatus(
                          "✅ Lagret til sky for " +
                            activeRole +
                            " og tatt i bruk"
                        );
                      } catch (e) {
                        console.error(e);
                        setStatus("❌ Feil ved lagring til sky");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Lagre til sky
                  </Button>

                  {/* HENT FRA SKY + TA I BRUK */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        const cloud = await loadFromCloud(activeRole);
                        const merged = { ...DEFAULT_CONFIG, ...cloud };
                        setDraft(merged);
                        setConfig(merged);
                        saveLocalConfig(activeRole, merged);
                        setStatus(
                          "✅ Hentet fra sky for " +
                            activeRole +
                            " og tatt i bruk"
                        );
                      } catch (e) {
                        console.error(e);
                        setStatus("❌ Feil ved henting fra sky");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Hent fra sky
                  </Button>
                </div>
                {status && <div className="text-sm opacity-80">{status}</div>}
              </div>

              <Separator />

              {/* NRK av/på */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">NRK-nyheter nederst</div>
                  <p className="text-xs text-slate-600">
                    Viser siste nyheter fra NRK i rullende linje nederst.
                  </p>
                </div>
                <Switch
                  checked={draft.newsEnabled}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, newsEnabled: v })
                  }
                />
              </div>

              <Separator />

              {/* Lagre / avbryt */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(config);
                    setStatus("");
                    setSettingsOpen(false);
                  }}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={() => {
                    handleSaveLocal();
                    setSettingsOpen(false);
                  }}
                >
                  Lagre lokalt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
