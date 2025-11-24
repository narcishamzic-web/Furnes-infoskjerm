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
} from "lucide-react";

/* ---------- Firebase ---------- */
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ---------- Konstanter ---------- */

const LOCAL_KEY = "infoskjerm_config_v1";

// NRK-nyheter via CORS-proxy
const NRK_RSS_URL =
  "https://api.allorigins.win/raw?url=https://www.nrk.no/nyheter/siste.rss";

/* ---------- Hjelpefunksjoner ---------- */

function loadLocalConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Kunne ikke lese localStorage", e);
    return null;
  }
}

function saveLocalConfig(cfg: any) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error("Kunne ikke lagre til localStorage", e);
  }
}

function stripHeavyFields(data: any) {
  // hvis vi senere får tunge felter (f.eks. filer), kan de fjernes her
  return { ...(data || {}) };
}

async function saveToCloud(data: any) {
  const safe = stripHeavyFields(data);
  const ref = doc(db, "configs", "default");
  await setDoc(ref, {
    ...safe,
    _updatedAt: serverTimestamp(),
  });
}

async function loadFromCloud() {
  const ref = doc(db, "configs", "default");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Ingen sky-data funnet ennå.");
  }
  return snap.data();
}

async function fetchNRKNewsTitles() {
  const res = await fetch(NRK_RSS_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
  const xml = await res.text();
  const docXml = new DOMParser().parseFromString(xml, "text/xml");
  const titles = Array.from(docXml.querySelectorAll("item > title"))
    .map((t) => (t.textContent || "").trim())
    .filter(Boolean)
    .slice(0, 30);
  return titles;
}

/* ---------- Standardkonfig ---------- */

const DEFAULT_CONFIG = {
  schoolName: "Furnes ungdomsskole",
  location: "Furnes, Ringsaker",
  imageUrlsText:
    "https://bilder.tine.no/api/v3/images/edda-article/96d9e875-fc03-46a2-8fde-3bfb03f26c7b.jpg?height=1200&ratio=16-9&width=1600",
  announcementTitle: "Kunngjøringer",
  announcements:
    "• Velkommen til FUSK!\n• Foreldremøte torsdag kl. 18.00 i aulaen.\n• Skolebiblioteket holder åpent hver dag storefri.",
  absenceTitle: "Fravær i dag",
  absence:
    "• Lærer: Kari Nordmann (8B)\n• Assistent: Per Hansen (2A)",
  carouselIntervalMs: 7000,
  newsEnabled: true,
};

/* ---------- Hovedkomponent ---------- */

export default function SkoleInfoskjerm() {
  const [config, setConfig] = useState(() => {
    return loadLocalConfig() || DEFAULT_CONFIG;
  });
  const [draft, setDraft] = useState(config);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [tickerText, setTickerText] = useState(
    "NRK: Laster siste nyheter…"
  );

  /* ---- Klokke ---- */
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
    const t = setInterval(updateTime, 15 * 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- Bildekarusell ---- */
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

  /* ---- Lagring lokalt ---- */
  const handleSaveLocal = () => {
    setConfig(draft);
    saveLocalConfig(draft);
    setStatus("✅ Lagret lokalt på denne enheten");
  };

  /* ---- Lese lokal lagring ved mount ---- */
  useEffect(() => {
    const stored = loadLocalConfig();
    if (stored) {
      setConfig(stored);
      setDraft(stored);
    }
  }, []);

  /* ---- Hent NRK-nyheter ---- */
  useEffect(() => {
    let alive = true;
    async function loadNews() {
      try {
        if (!config.newsEnabled) {
          setTickerText("");
          return;
        }
        const titles = await fetchNRKNewsTitles();
        if (!alive) return;
        if (!titles.length) {
          setTickerText("NRK: Ingen nyheter funnet");
        } else {
          setTickerText("NRK: " + titles.join(" • "));
        }
      } catch (e) {
        if (!alive) return;
        setTickerText("NRK: Siste nyheter – (feil ved henting)");
      }
    }
    loadNews();
    const t = setInterval(loadNews, 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [config.newsEnabled]);

  /* ---------- Render ---------- */

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 text-slate-900 flex flex-col">
      {/* Toppheader */}
      <header className="px-6 py-4 flex items-center justify-between bg-sky-50/60 backdrop-blur border-b border-sky-100">
        <div>
          <div className="text-xl font-semibold">
            {config.schoolName || "Infoskjerm"}
          </div>
          <div className="flex items-center text-sm text-slate-600 gap-1">
            <MapPin className="w-4 h-4" />
            <span>{config.location || ""}</span>
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Cloud className="w-5 h-5" />
            <div>
              <div className="font-medium">Vær</div>
              <div className="text-xs text-slate-600">
                Oppdater manuelt i tekst for nå
              </div>
            </div>
          </div>

          {/* Innstillinger-knapp */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setDraft(config); // start alltid fra gjeldende config
              setStatus("");
              setSettingsOpen(true);
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hovedinnhold */}
      <main className="flex-1 px-6 py-4 flex gap-4 overflow-hidden">
        {/* Venstre: bildekarusell */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {imageUrls.length ? (
              <div className="relative h-full">
                <motion.img
                  key={imageUrls[currentImageIndex]}
                  src={imageUrls[currentImageIndex]}
                  alt=""
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute bottom-2 right-3 text-xs bg-slate-900/70 text-white px-2 py-1 rounded-full">
                  {currentImageIndex + 1}/{imageUrls.length}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Ingen bilder – legg til i innstillinger.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Høyre: kunngjøringer + fravær */}
        <div className="w-[380px] flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Newspaper className="w-4 h-4" />
                <span>{config.announcementTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">
              {config.announcements}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                <span>{config.absenceTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">
              {config.absence}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* NRK-ticker nederst */}
      {config.newsEnabled && tickerText && (
        <div className="h-10 bg-blue-600 text-white flex items-center overflow-hidden px-4">
          <Newspaper className="w-4 h-4 mr-2 flex-shrink-0" />
          <div className="relative w-full overflow-hidden">
            <motion.div
              className="whitespace-nowrap"
              animate={{ x: ["100%", "-100%"] }}
              transition={{
                repeat: Infinity,
                duration: 60,
                ease: "linear",
              }}
            >
              {tickerText}
            </motion.div>
          </div>
        </div>
      )}

      {/* Eget modal-vindu for innstillinger */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Innstillinger
              </h2>
              <Button
                variant="ghost"
                onClick={() => setSettingsOpen(false)}
              >
                Lukk
              </Button>
            </div>

            <div className="space-y-6">
              {/* Skoleinfo */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    Skolens navn
                  </label>
                  <Input
                    value={draft.schoolName}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        schoolName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Sted
                  </label>
                  <Input
                    value={draft.location}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        location: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Bildekarusell */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  <div className="font-medium">
                    Bildekarusell (nettside-bilder)
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Lim inn én bildeadresse (URL) per linje. Bildene
                  rullerer automatisk.
                </p>
                <Textarea
                  rows={5}
                  value={draft.imageUrlsText}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      imageUrlsText: e.target.value,
                    })
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
                        carouselIntervalMs:
                          Number(e.target.value) || 7000,
                      })
                    }
                  />
                  <span>ms (1000 ms = 1 sekund)</span>
                </div>
              </div>

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
                    setDraft({
                      ...draft,
                      announcements: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-slate-600">
                  Bruk én linje per punkt. Linjer som starter med
                  «•» beholdes som de er.
                </p>
              </div>

              <Separator />

              {/* Fravær */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <div className="font-medium">Fravær i dag</div>
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
                    setDraft({
                      ...draft,
                      absence: e.target.value,
                    })
                  }
                />
              </div>

              <Separator />

              {/* Sky */}
              <div className="space-y-2">
                <div className="font-medium">Sky</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        await saveToCloud(draft);
                        setStatus("✅ Lagret til sky");
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
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        const cloud = await loadFromCloud();
                        setDraft({ ...draft, ...cloud });
                        setStatus(
                          "✅ Hentet fra sky (ikke lagret lokalt ennå)"
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
                {!!status && (
                  <div className="text-sm opacity-80">
                    {status}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  «Lagre» nedenfor lagrer lokalt på denne enheten.
                  «Lagre til sky» deler innholdet med alle enheter
                  som åpner infoskjermen.
                </p>
              </div>

              <Separator />

              {/* NRK-ticker av/på */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    NRK-nyheter nederst
                  </div>
                  <p className="text-xs text-slate-600">
                    Viser siste nyheter fra NRK i rullende linje
                    nederst på skjermen.
                  </p>
                </div>
                <Switch
                  checked={draft.newsEnabled}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, newsEnabled: v })
                  }
                />
              </div>

              {/* Lagre / avbryt */}
              <Separator />
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
