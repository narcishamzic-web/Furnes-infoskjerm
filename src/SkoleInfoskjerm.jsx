import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Switch } from "./components/ui/switch";
import { Separator } from "./components/ui/separator";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  MapPin,
  Images,
  Newspaper,
  Megaphone,
  Users,
  Settings,
  Maximize2,
  RefreshCw,
  Upload,
} from "lucide-react";

/* ---------------- Utils ---------------- */
function formatTime(date, showSeconds) {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
  }).format(date);
}
function formatDate(date) {
  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/* ---------------- Weather ---------------- */
function weatherIcon(code) {
  if (code == null) return <Cloud className="h-7 w-7" />;
  if ([0, 1].includes(code)) return <Sun className="h-7 w-7" />;
  if ([2, 3].includes(code)) return <Cloud className="h-7 w-7" />;
  if ([45, 48].includes(code)) return <CloudFog className="h-7 w-7" />;
  if ([51, 53, 55].includes(code)) return <CloudDrizzle className="h-7 w-7" />;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="h-7 w-7" />;
  if ([71, 73, 75, 85, 86].includes(code)) return <CloudSnow className="h-7 w-7" />;
  if ([95, 96, 99].includes(code)) return <CloudLightning className="h-7 w-7" />;
  return <Cloud className="h-7 w-7" />;
}
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  const cw = data?.current_weather ?? {};
  return {
    temperature: typeof cw.temperature === "number" ? cw.temperature : null,
    windspeed: typeof cw.windspeed === "number" ? cw.windspeed : null,
    weathercode: typeof cw.weathercode === "number" ? cw.weathercode : null,
  };
}

/* ---------------- News (NRK RSS) ---------------- */
async function fetchRssTitles(rssUrl, proxyBase) {
  try {
    const proxied = `${proxyBase}${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxied);
    const text = await res.text();
    const xml = new window.DOMParser().parseFromString(text, "application/xml");
    const items = Array.from(xml.querySelectorAll("item > title"));
    const titles = items.map((n) => n.textContent?.trim()).filter(Boolean);
    if (titles.length) return titles;
  } catch (e) {
    console.warn("RSS fetch failed", e);
  }
  return ["NRK: Siste nyheter – (feil ved henting)"];
}

/* ---------------- Components ---------------- */
function Logo({ url, name }) {
  if (url) return <img src={url} alt={`${name} logo`} className="h-12 w-auto object-contain drop-shadow-sm" />;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return <div className="h-12 w-12 rounded-xl bg-blue-600 text-white grid place-items-center font-bold">{initials}</div>;
}

function HeaderBar({ cfg, weather }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full grid grid-cols-3 items-center gap-4 p-4">
      <div className="flex items-center gap-3">
        <Logo url={cfg.logoUrl} name={cfg.schoolName} />
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{cfg.schoolName}</h1>
          <div className="text-xs opacity-80 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {cfg.locationName}
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold leading-none tabular-nums">{formatTime(now, cfg.showSeconds)}</div>
        <div className="text-sm opacity-80">{formatDate(now)}</div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Card className="border-none bg-white/70 backdrop-blur px-3 py-2">
          <div className="flex items-center gap-3">
            {weatherIcon(weather?.weathercode ?? null)}
            <div className="leading-tight">
              <div className="text-lg font-semibold">{weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : "—"}</div>
              <div className="text-xs opacity-80">Vind {weather?.windspeed != null ? `${Math.round(weather.windspeed)} m/s` : "—"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ImageCarousel({ images, intervalMs, failedCount = 0 }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!images.length) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(t);
  }, [images, intervalMs]);

  const current = images[index];
  return (
    <div className="relative h-[62vh] w-full overflow-hidden rounded-2xl shadow-sm">
      {images.length ? (
        <AnimatePresence mode="wait">
          <motion.img
            key={current}
            src={current}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            alt="Karusellbilde"
          />
        </AnimatePresence>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-slate-500">Ingen gyldige bilder</div>
      )}
      <div className="absolute right-3 bottom-3 rounded-full bg-blue-600/80 text-white text-xs px-2 py-1">
        {images.length ? `${index + 1}/${images.length}` : "0/0"}
      </div>
      {failedCount > 0 && (
        <div className="absolute left-3 bottom-3 rounded-full bg-black/60 text-white text-xs px-2 py-1">
          {failedCount} bilde(r) feilet
        </div>
      )}
    </div>
  );
}

function TextList({ title, icon, lines }) {
  return (
    <Card className="h-[30vh] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 h-full">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 space-y-2">
            {lines.length === 0 && <div className="opacity-60">Ingen oppføringer</div>}
            {lines.map((l, i) => (<div key={i} className="text-base leading-relaxed">• {l}</div>))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsTicker({ items, speedSec }) {
  const joined = items.join("  •  ");
  return (
    <div className="w-full overflow-hidden whitespace-nowrap rounded-xl bg-blue-700 text-white py-3">
      <div className="inline-block will-change-transform" style={{ paddingLeft: "100%", animation: `ticker ${Math.max(speedSec, 10)}s linear infinite` }}>
        <span className="px-4">
          <Newspaper className="inline-block h-5 w-5 mr-2 -mt-1" />
          {joined}
        </span>
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-100%); } }`}</style>
    </div>
  );
}

function FullscreenButtons() {
  const enterFs = async () => { try { await document.documentElement.requestFullscreen(); } catch {} };
  const reload = () => window.location.reload();
  return (
    <div className="fixed bottom-4 right-4 flex gap-2 z-50">
      <Button variant="secondary" className="shadow" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" /> Oppdater</Button>
      <Button className="shadow" onClick={enterFs}><Maximize2 className="mr-2 h-4 w-4" /> Helskjerm</Button>
    </div>
  );
}

/* ---------------- Settings Dialog ---------------- */
function SettingsDialog({ cfg, setCfg }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(cfg);

  const apply = () => {
    localStorage.setItem("skole-infoskjerm-config-v3", JSON.stringify(draft));
    setCfg(draft);
    setOpen(false);
  };
  useEffect(() => setDraft(cfg), [cfg]);
  const update = (patch) => setDraft({ ...draft, ...patch });

  const onLogoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ logoUrl: String(reader.result || "") });
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed bottom-4 left-4 z-50 shadow" onClick={() => setOpen(true)}>
          <Settings className="mr-2 h-4 w-4" /> Innstillinger
        </Button>
      </DialogTrigger>

      {open && (
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Innstillinger</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skole & sted */}
            <div className="space-y-4">
              <h3 className="font-medium">Skole & sted</h3>
              <Input value={draft.schoolName} onChange={(e) => update({ schoolName: e.target.value })} placeholder="Skolenavn" />
              <Input value={draft.locationName} onChange={(e) => update({ locationName: e.target.value })} placeholder="F.eks. Furnes, Ringsaker" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.0001" value={draft.latitude} onChange={(e) => update({ latitude: parseFloat(e.target.value) })} placeholder="Breddegrad" />
                <Input type="number" step="0.0001" value={draft.longitude} onChange={(e) => update({ longitude: parseFloat(e.target.value) })} placeholder="Lengdegrad" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Vis sekunder på klokka</label>
                <Switch checked={draft.showSeconds} onCheckedChange={(v) => update({ showSeconds: v })} />
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-4">
              <h3 className="font-medium">Logo</h3>
              <Input value={draft.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} placeholder="Lim inn bilde-URL (eller last opp under)" />
              <label className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" /> Last opp logo-fil
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
              </label>
              <div className="text-xs opacity-70">Logo lagres lokalt (data-URL) slik at den alltid vises på denne enheten.</div>
            </div>

            {/* Nyheter */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2"><Newspaper className="h-4 w-4" /> Nyheter (NRK – «Siste»)</h3>
              <Input value={draft.newsRssUrl} onChange={(e) => update({ newsRssUrl: e.target.value })} placeholder="https://www.nrk.no/nyheter/siste.rss" />
              <Input value={draft.newsProxyUrl} onChange={(e) => update({ newsProxyUrl: e.target.value })} placeholder="/.netlify/functions/rss?url=" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Oppdater hvert (ms)</label>
                <Input type="number" value={draft.newsRefreshMs} onChange={(e) => update({ newsRefreshMs: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>

            {/* Bildekarusell */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-medium flex items-center gap-2"><Images className="h-4 w-4" /> Bildekarusell</h3>

              {/* URL-er: én per linje */}
              <Textarea
                rows={4}
                value={(draft.carouselImages || []).join("\n")}
                onChange={(e) => update({ carouselImages: e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                placeholder="Lim inn bildeadresser (én per linje – valgfritt)"
              />

              {/* Ny: opplasting av bilder */}
              <div className="flex items-center gap-3">
                <label className="text-sm">Last opp bilder (flere om gangen)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const toDataUrl = (file) =>
                      new Promise((res) => {
                        const r = new FileReader();
                        r.onload = () => res(String(r.result || ""));
                        r.readAsDataURL(file);
                      });
                    const dataUrls = await Promise.all(files.map(toDataUrl));
                    const next = [...(draft.carouselUploads || []), ...dataUrls];
                    update({ carouselUploads: next });
                  }}
                />
              </div>
              <div className="text-xs opacity-70">Opplastede bilder lagres lokalt (data-URL), akkurat som logoen.</div>
              {(draft.carouselUploads?.length || 0) > 0 && (
                <div className="text-sm mt-2 flex items-center gap-2">
                  <span>{draft.carouselUploads.length} opplastet(e) bilde(r)</span>
                  <Button variant="outline" onClick={() => update({ carouselUploads: [] })} className="px-2 py-1 text-xs">
                    Tøm opplastede
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="col-span-2">
                  <label className="text-sm">Bytt bilde hvert (ms)</label>
                  <Input type="number" value={draft.rotateEveryMs} onChange={(e) => update({ rotateEveryMs: parseInt(e.target.value || "0", 10) })} />
                </div>
                <div>
                  <label className="text-sm">Vær: oppdater (ms)</label>
                  <Input type="number" value={draft.weatherRefreshMs} onChange={(e) => update({ weatherRefreshMs: parseInt(e.target.value || "0", 10) })} />
                </div>
                <div>
                  <label className="text-sm">Ticker-hastighet (sek)</label>
                  <Input type="number" value={draft.tickerSpeed} onChange={(e) => update({ tickerSpeed: parseInt(e.target.value || "0", 10) })} />
                </div>
              </div>
            </div>

            {/* Kunngjøringer / Fravær */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2"><Megaphone className="h-4 w-4" /> Kunngjøringer</h3>
              <Textarea rows={8} value={draft.announcements} onChange={(e) => update({ announcements: e.target.value })} placeholder="Én rad per beskjed" />
            </div>
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Fravær</h3>
              <Textarea rows={8} value={draft.absences} onChange={(e) => update({ absences: e.target.value })} placeholder="Én rad per person/klasse" />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={apply}>Lagre</Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

/* ---------------- Main ---------------- */
const DEFAULT_CONFIG = {
  schoolName: "Furnes ungdomsskole",
  locationName: "Furnes, Ringsaker",
  latitude: 60.843,
  longitude: 10.866,
  showSeconds: false,
  logoUrl: "",
  newsRssUrl: "https://www.nrk.no/nyheter/siste.rss",
  newsProxyUrl: "/.netlify/functions/rss?url=",
  newsRefreshMs: 300000,
  tickerSpeed: 45,
  carouselImages: [],      // URL-er (valgfritt)
  carouselUploads: [],     // Opplastede bilder (data:URL)
  rotateEveryMs: 7000,
  weatherRefreshMs: 600000,
  announcements: "Velkommen til FUSK!\nForeldremøte torsdag kl. 18:00 i aulaen.\nSkolebiblioteket holder åpent hver dag storefri.",
  absences: "Lærer: Kari Nordmann (8B)\nAssistent: Per Hansen (2A)",
};

export default function SkoleInfoskjerm() {
  const [cfg, setCfg] = useState(() => {
    try {
      const raw = localStorage.getItem("skole-infoskjerm-config-v3");
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState([]);
  const [validImages, setValidImages] = useState([]);
  const [failedImages, setFailedImages] = useState(0);

  // Weather
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const w = await fetchWeather(cfg.latitude, cfg.longitude);
        if (!cancelled) setWeather(w);
      } catch {}
    };
    load();
    const t = setInterval(load, Math.max(60000, cfg.weatherRefreshMs));
    return () => { cancelled = true; clearInterval(t); };
  }, [cfg.latitude, cfg.longitude, cfg.weatherRefreshMs]);

  // News
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const items = await fetchRssTitles(cfg.newsRssUrl, cfg.newsProxyUrl);
      if (!cancelled) setNews(items);
    };
    load();
    const t = setInterval(load, Math.max(60000, cfg.newsRefreshMs));
    return () => { cancelled = true; clearInterval(t); };
  }, [cfg.newsRssUrl, cfg.newsRefreshMs, cfg.newsProxyUrl]);

  // Combine uploads + URLs and preload/filter
  useEffect(() => {
    let cancelled = false;
    const probe = (url) =>
      new Promise((resolve) => {
        if ((url || "").startsWith("data:")) return resolve(true);
        const img = new Image();
        const done = (ok) => resolve(ok);
        img.onload = () => done(true);
        img.onerror = () => done(false);
        img.src = url;
        setTimeout(() => done(false), 7000);
      });
    (async () => {
      const uploads = (cfg.carouselUploads || []).map((s) => s.trim()).filter(Boolean);
      const urls = (cfg.carouselImages || []).map((s) => s.trim()).filter(Boolean);
      const all = [...uploads, ...urls];
      if (!all.length) { if (!cancelled) { setValidImages([]); setFailedImages(0); } return; }
      const results = await Promise.all(all.map(probe));
      const ok = all.filter((_, i) => results[i]);
      if (!cancelled) { setValidImages(ok); setFailedImages(all.length - ok.length); }
    })();
    return () => { cancelled = true; };
  }, [cfg.carouselUploads, cfg.carouselImages]);

  const announcementLines = useMemo(() => (cfg.announcements || "").split(/\n+/).map(s=>s.trim()).filter(Boolean), [cfg.announcements]);
  const absenceLines      = useMemo(() => (cfg.absences || "").split(/\n+/).map(s=>s.trim()).filter(Boolean), [cfg.absences]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-100 via-teal-100 to-emerald-100 text-slate-900 select-none">
      <div className="max-w-[1920px] mx-auto p-4 pb-24">
        <HeaderBar cfg={cfg} weather={weather} />

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8">
            <ImageCarousel images={validImages} failedCount={failedImages} intervalMs={cfg.rotateEveryMs} />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
            <TextList title="Kunngjøringer" icon={<Megaphone className="h-5 w-5" />} lines={announcementLines} />
            <TextList title="Fravær i dag" icon={<Users className="h-5 w-5" />} lines={absenceLines} />
          </div>
          <div className="col-span-12">
            <NewsTicker items={news} speedSec={cfg.tickerSpeed} />
          </div>
        </div>
      </div>

      <FullscreenButtons />
      <SettingsDialog cfg={cfg} setCfg={setCfg} />
    </div>
  );
}
