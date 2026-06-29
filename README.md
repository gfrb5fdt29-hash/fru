# Balance 1600

Offline használható, iPhone-ra optimalizált, statikus étrend PWA.

## GitHub Pages használat

1. Csomagold ki a ZIP-et.
2. A ZIP gyökerében lévő fájlokat töltsd fel a repository gyökerébe.
3. GitHubon: Settings → Pages → Deploy from branch → main / root.
4. Nyisd meg a Pages linket.

## Fájlok

- `index.html`
- `assets/styles.css`
- `assets/app.js`
- `data/app-data.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icons/`

## V3 javítások

- Új nézet vagy új tartalom megnyitásakor az oldal felülről indul.
- A Hetek fül teljesen iPhone-kompatibilis, egyoszlopos listanézetet kapott.
- Felül 4 egységes hétválasztó gomb látható.
- A hét napkártyáin nap neve, kcal, makrók, címkék és a 4 étkezés kcal-val együtt jelenik meg.
- A napkártyák már a tényleges kiválasztott napot nyitják meg, nem mindig az 1. hét hétfőjét.
- A napkártyák külön napi lapon nyílnak meg, vissza gombbal.
- Az alsó navigáció prémiumabb ikon + rövid szöveg jellegű maradt, az aktív lap neon zöld kiemelést kapott.
- A service worker cache verzió frissült, hogy az új fájlok könnyebben felülírják a korábbi telepített verziót.

A naplózás, pipák, kedvencek, bevásárlólista és beállítások a készüléken maradnak.
