# Balance 1600 PWA

iPhone 14 Pro-ra optimalizált, offline működő, statikus étrend PWA a mellékelt 4 hetes 1600 kcal-os adatfájl alapján.

## Helyi futtatás

A legegyszerűbb ellenőrzéshez indíts egy statikus szervert a mappában:

```bash
python3 -m http.server 8080
```

Majd nyisd meg:

```text
http://localhost:8080
```

## GitHub Pages publikálás

1. Hozz létre egy új GitHub repositoryt.
2. Töltsd fel a ZIP-ben lévő fájlokat a repository gyökerébe.
3. Settings → Pages → Deploy from branch.
4. Branch: `main`, folder: `/root`.
5. Mentés után a Pages URL-en futni fog az app.

## Build

Nincs külön build lépés. Tiszta HTML/CSS/JS, backend és telepítés nélkül.

## Offline működés

A `service-worker.js` cache-eli az app shellt, a stílusokat, a scriptet, az adatállományt és az ikonokat. Első online betöltés után az app offline is megnyílik.

## Helyi tárolás

Az étkezéspipák, bevásárlólista pipák, kedvencek, naplóbejegyzések és beállítások a böngésző helyi tárhelyén maradnak. Külső szerverre nem küld adatot.

## Adatfájl

Az étrendi tartalom a `data/app-data.js` fájlban található, amely a mellékelt `etrend_1600_pwa_adatlista_v3_1_adatminosegi_tisztitas(2).json` tartalmából készült.

## Szelektív adattörlés

Az appban a jobb felső fogaskerék alatt külön törölhető:

- étkezéspipák
- bevásárlólista pipák
- kedvencek
- naplóadatok
- belépő/kezdőnap beállítások
- minden helyi adat
