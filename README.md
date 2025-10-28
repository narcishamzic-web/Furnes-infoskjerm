
# Furnes Infoskjerm (Netlify klar)

Dette er en ferdig pakke klar for Netlify (med serverless-funksjon for NRK RSS).

## Kom i gang
1. Pakk ut mappen, åpne i terminal:
   ```bash
   npm install
   npm run dev
   ```
   Åpne http://localhost:5173

2. Deploy til Netlify via Git:
   - Opprett et Git-repo (GitHub/GitLab).
   - Push denne mappen.
   - I Netlify: **New site from Git** → velg repo.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. Etter første deploy:
   - Åpne nettstedet.
   - Klikk **Innstillinger** nederst til venstre.
   - Sett `Nyheter`:
     - `newsRssUrl`: `https://www.nrk.no/nyheter/siste.rss`
     - `newsProxyUrl`: `/.netlify/functions/rss?url=`
   - Legg inn kunngjøringer, fravær og bildeadresser.
   - (Valgfritt) Last opp logo – lagres lokalt på skjermen.

## TV-oppsett
- Åpne URL-en på TV-ens nettleser (sett som startside).
- Slå av skjermsparer/strømsparing.
- Helskjerm-knapp innebygd (om TV støtter).

## Endring av bakgrunnstema
`SkoleInfoskjerm.jsx` → juster gradientklassen på rot-diven.

## Support
Gi meg URL-en din om noe feiler, så hjelper jeg.
