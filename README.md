# 28 napos étrend PWA — FIXED v29

GitHub Pages-kompatibilis, statikus, offline-képes étrend és életmód segítő app.

## v9 fő javítások

- Bevásárlás fülön a súlyok magyar formátumban jelennek meg: például 1200 g helyett 1,2 kg, 1250 g helyett 1,25 kg.
- A külön „Napi lista napja” blokk kikerült. Egyetlen napkijelölő rendszer maradt: egy nap = napi lista, több nap = összevont lista.
- A Receptek fül szűrői kompaktabbak lettek, és egyszerre csak egy szűrő lehet aktív.
- A felső felső box visszafogottabb glow-t kapott, a szöveg előtt és után piros szívecskével.
- A beállítások gomb egyértelmű fogaskerék ikon lett narancssárga kerettel.
- A home gomb megmaradt.
- A v8 összes korábbi javítása megmaradt.

## Használat GitHub Pages-en

A ZIP tartalmát közvetlenül a repository gyökerébe kell feltölteni, majd GitHub Pages-en a root mappát publikálni.



## v11 főképernyő ikon

- A PWA főképernyő/app ikonja a kiválasztott A3 terv alapján frissítve.
- Nem készült új ikonvariáció: a tervlap A3 ikonja lett kivágva és méretezve.
- Frissített ikonok: icon-192.png, icon-512.png, apple-touch-icon.png.
- Service worker cache: balance1600-v22.

## v10 ikonfrissítés
- Alsó navigáció a választott B verzió szerint: kitöltött, lágy ikonok.
- Ma: házikó szívvel.
- Naptár: naptár.
- Receptek: séfsapka szívvel.
- Bevásárlás: bevásárlótáska szívvel.
- Napló: naplófüzet szívvel.
- Nem került be új, eltérő ikonkoncepció.
- Service worker cache: balance1600-v22.


## v12 javítások
- Felső felső box új szöveggel, két sorra optimalizálva, visszafogottabb glow-val.
- Jobb felső Beállítások és Home gomb nagyobb lett.
- Receptek fülön csak a keresősáv marad sticky, a szűrők görgetéskor eltűnnek.
- Napló csúszkák 0/10 formátumú, élő jobb oldali értéket és magyarázatot kaptak.


## v13 javítások
- Napló és Bevásárlás: 2×2 heti boxos napválasztó.
- Napló: víz-kék vízbox, 0,5 literes csúszka.
- Mai közérzet: testsúly mező eltávolítva.
- App háttérszíne látványosan világosabb, de továbbra is prémium sötét hangulatú.
- Service worker cache: balance1600-v22.


## v15 módosítások

- Belépő képernyő felső címe a fő fejléc stílusához igazítva.
- Belépő képernyőn rövid appismertető és dátumlogikai segítség.
- Napló vízcsúszka jobb oldali értéke csak az aktuális literértéket mutatja, napi cél nélkül.
- Víz nullázása mellé külön Mentés gomb került.
- Az app háttérszíne a v13-hoz képest kissé sötétebb, de továbbra is világosabb/prémium mélykék.
- Service worker cache: balance1600-v22.


## v15 változások

- Beépítve a v3.2 részletes elkészítési adatforrás.
- A receptlapokon az Elkészítés rész lépéskártyákban, részletesebben jelenik meg.
- A korábbi v14 funkciók és ikonok megtartva.


## v16 módosítások
- Belépő beállítás képernyő finomhangolva: nincs külön ciklusmodul be/ki kérdés.
- Ciklusfókusz automatikusan aktív, a kezdőnap és ciklushossz mezők közvetlenül látszanak.
- Új app használati segédlet kártya a Kezdjük gomb fölött.
- Onboarding boxok, gombok és sávok iPhone méretre kompaktabbra igazítva.
- Service worker cache: balance1600-v22.

## v17 módosítások
- Bevásárlás fül: heti nézetben már csak hétválasztó boxok jelennek meg, napgombok nem.
- Bevásárlás és Napló: prémiumabb 2×2 heti box design, egységesebb glass/glow hatással.
- Service worker cache: balance1600-v22.


## v18 módosítások
- Onboarding dátummezők szélességjavítása, nagyobb belépő betűméret, ciklussegéd szöveg eltávolítva.
- Jobb felső Home és Beállítások ikon nagyobb, erősebb prémium glow-val.
- felső fejléc görgetéskor kisebbre zsugorodik.
- Receptkártyákon főzési jelzés: Gyors / Általános / Hosszabb.
- Bevásárlásnál a csoportosított lista nyitott kártyákban marad, a pipált elemek elrejthetők.
- Napló fülön kiválasztott hét alá részletes, áttekinthető heti mini összegzés került.
- „Miért így?” szövegek személyesebbek, személyesebbak.
- Nézet- és sheet-animációk egységesebb, látványosabb iPhone-szerű mozgást kaptak.


## v19 módosítások
- Főzési jelzések egyszerűsítve: Gyors / Általános / Hosszabb.
- A főzési jelzés a részletes napi étkezéskártyákon is megjelenik.
- Kártyák finomabb border/shadow/glow hangolást kaptak nagy irányváltás nélkül.
- Étkezéskártyák reggeli / ebéd / uzsonna / vacsora szerint apró ikon- és színcsík-különbséget kaptak.
- Bottom sheet nyitás látványosabb, rugósabb iPhone-szerű animációval és erősebb blur háttérrel.
- Nézetváltás fade + enyhe felúszás animációra hangolva.
- Aktív alsó fül lassú, finom pulzáló glow-t kapott.
- Miért így? szövegek személyesebb, személyesebb hangvételt kaptak.
- Napló vízbox kékebb, vizesebb, csillogóbb lett.
- Korábbi vízbox duplikációs HTML-hiba javítva.


## v22 módosítások
- Az aktív alsó fül pulzáló/villogó effektje kikapcsolva; az aktív állapot statikus glow-val marad jól látható.
- Az app kártyavilága színesebb prémium gradiens rendszert kapott.
- A fő színirányok: mélykék, mélyzöld, vízzöld, narancssárga és rózsaszín.
- Étkezés-, recept-, bevásárlás-, napló-, heti-, lista- és lépéskártyák finom egyedi színátmenetet és enyhe glow-t kaptak.
- Service worker cache: balance1600-v22.


## v22 módosítások
- Bal szélről jobbra húzásos visszalépés hozzáadva.
- Beállítások sheet méret-optimalizálva iPhone-on.
- Kártyák színvilága egységes, visszafogott kék-zöld átmenetre állítva.
- Napló felső napválasztója egymás alatti, lenyitható heti sávokra módosítva.


## v22 módosítások

- Bevásárlás fül nem-heti napválasztója a Napló fülhöz igazított, egymás alatti lenyitható heti sávos elrendezést kapott.
- Napló és Bevásárlás napválasztóiban a napgombok rövid magyar jelöléssel jelennek meg: H, K, Sze, Cs, P, Szo, V.
- Az app dátumlogikája a diéta kezdőnapja és az eszköz aktuális dátuma alapján számol.
- A 28 napos terv automatikusan újraindul az 1. naptól; a hetek továbbra is 1–4. hétként maradnak.
- Naptár fül napkártyáin nagyban a valós nap + dátum látszik, alatta az étrendlogika: 1. hét · 3. nap.


## v23 módosítások
- Beállításokból törölve a „Ciklusmodul bekapcsolva” kapcsoló és pipálhatóság.
- Napló és Bevásárlás heti sávjaiból kikerült a „napok megnyitása/elrejtése” szöveg.
- Napló és Bevásárlás napgombjai rövid valós dátumot is mutatnak, például 07.03.
- Napló/Bevásárlás heti sáv lenyitásakor nem ugrik fel az oldal tetejére.
- Service worker cache: balance1600-v23.


## v24 módosítás

- Alsó ikonsor kevésbé rózsaszínes, fülenként saját színnel: Ma vízzöld, Naptár fehér/kék naptár, Receptek narancs, Bevásárlás zöld, Napló kék.
- Aktív fül statikus, saját színű glow-val marad jelölt.
- Service worker cache: balance1600-v24.


## v25 javítások

- Dátumlogika magyarázó box bekerült a belépő beállításba és a Beállítások menübe, példával együtt.
- Jobb felső Home és Beállítások ikonok nagyobbak, a gombkeretet szorosabban kitöltik.
- Napló fülön napra kattintáskor nincs külön nézetváltó animáció és nem ugrik fel/le a képernyő.
- Az app animációi megmaradtak, de lassabbak és nyugodtabbak lettek.
- Service worker cache: balance1600-v26.


## v26 rövid módosítás
- A Hetek fül neve Naptár lett.
- Receptek szűrő kattintásakor nincs fel-le nézetanimáció és nincs automatikus felugrás.
- Naptár felső hétválasztó kattintásakor nincs fel-le nézetanimáció.
- Service worker cache: balance1600-v26.


## v28 módosítások
- Világosabb teljes app háttér és felület.
- Erősebb kártyakeretek és nagyobb, élethűbb árnyékok.
- Felső cím: „28 napos étrend naplóval, közérzetkövetéssel Fruzsinak”.
- Egységesebb fejléc a címmel, Home és Beállítások gombbal.
- Service worker cache: balance1600-v29.


## v29 módosítás
- Felső box szövege: „28 napos étrend naplóval, közérzetkövetéssel Fruzsinak”.
- Az 5 fő fül saját oldalszínvilágot kapott: Ma kék-zöld, Naptár világosabb bézs/fehér, Receptek narancs-arany OLED, Bevásárlás türkiz/smaragd, Napló lila árnyalatos.
- Service worker cache: balance1600-v29.


## v30 módosítás
- Fülönként teljesen összehangolt színrendszer: háttér, fejléc, kártyák, pipák, kijelölések, bottom sheetek és alsó fülsáv az aktív fül palettáját követik.
- Ma: karakteres kék-zöld; Naptár: champagne/pezsgő; Receptek: borostyán-méz-karamell; Bevásárlás: vízkék/türkiz/smaragd; Napló: levendula/lila.
- Service worker cache: balance1600-v30.
