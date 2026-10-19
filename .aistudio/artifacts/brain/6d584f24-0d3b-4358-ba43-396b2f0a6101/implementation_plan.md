# Nytt app-ikon og visuell profil for BLU-hjelperen

Utskifting av det utdaterte "Pedledern FAGPORTAL"-kameraikonet med et dedikert, høyoppløselig grafisk vektorikon tilpasset BLU-hjelperen (åpen fagbok, elegant fyllepenn og vekstspire i akademisk kongeblå og gyldent gull).

---

## Brukeravklaringer & Beslutninger

> [!IMPORTANT]
> Følgende valg er bekreftet av brukeren:
> - **Hovedmotiv**: Åpen fagbok med fyllepenn og spire for vekst.
> - **Tekst vs. grafikk**: Rent grafisk symbol uten liten tekst, slik at ikonet fremstår krystallklart og profesjonelt på alle skjermstørrelser (mobilhomescreen, Edge/Chrome snarveier og favikoner).
> - **Fargepalett**: Akademisk dyp kongeblå med gyldne gradienter og elfenbenshvite kontraster.

---

## 1. Oversikt & Konsept

BLU-hjelperen er en digital skrivepartner og støtteportal for barnehagelærerstudenter (BLU). Det eksisterende ikonet stammet fra et tidligere prosjekt ("Pedleder'n") og viste et kamera med liten tekst som ble vanskelig å tyde og misvisende på telefonens hjemskjerm og i nettleseren.

Det nye ikonet vil:
1. Kommunisere akademisk skrivehjelp og refleksjon (åpen bok og skrivepenn).
2. Representere barnehagelærerprofesjonen og barnas læringsmiljø (den oppadstigende spiren/veksten).
3. Være 100 % vektorbasert (SVG) og tilpasset maskable PWA-krav for Android One UI, iOS og skrivebord.

---

## 2. Visuell Design & Ikonarkitektur

```
┌────────────────────────────────────────────────────────┐
│               App-ikon Geometri & Lag                  │
├────────────────────────────────────────────────────────┤
│  [1] Ytre form: Mykt avrundet squircla/superellipse    │
│      Fargegradient: Dyp kongeblå (#0b1d3a → #1e3a8a)   │
│      Subtil indre lysglans for dybde og kontrast       │
│                                                        │
│  [2] Hovedsymbol: Åpen fagbok (elfenbenshvit/lysblå)   │
│      Vinklede boksider med myke kurver                 │
│                                                        │
│  [3] Kjerneelement: Fyllepenn & pedagogisk spire        │
│      Gylden fyllepenn-spiss i sentrum                  │
│      To elegante, organiske spireblader (vekst/barne- │
│      hagepedagogikk) i varm gylden gradient (#f59e0b)  │
│                                                        │
│  [4] Sikker sone (Maskable Safe Zone):                │
│      Hovedmotivet er sentrert innenfor 80 % radius for │
│      å unngå avkutting i sirkulære/kvadratiske Android-│
│      ikoner (One UI adaptive icons).                   │
└────────────────────────────────────────────────────────┘
```

### Fargetoner & Gradienter
- **Primærbakgrunn**: Linear gradient fra dyp nattblå (`#0b1d3a`) via akademisk kongeblå (`#17356a`) til dyp safir (`#1e3a8a`).
- **Bokarkitektur**: Myk elfenbenshvit (`#f8fafc`) med diskret skyggelegging (`#cbd5e1` / `#94a3b8`) for tredimensjonal dybde.
- **Gull-aksenter (Penn og spire)**: Varm solgylden gradient (`#fef08a` → `#f59e0b` → `#d97706`).

---

## 3. Tekniske Endringer

### Filer som oppdateres:
1. **`/public/icon.svg`**:
   - Skrive om SVG-koden fra scratch med ren, optimalisert vektorgeometri.
   - Fjerne all gammel "Pedleder'n"-grafikk og tekst.
   - Sørge for skarp skalering fra 16x16 til 512x512 og definere `maskable`-sikkerhetssoner.

2. **`/public/manifest.json`**:
   - Oppdatere `theme_color` og `background_color` til `#0b1d3a` (kongeblå) så navigasjonslinjen og splash-skjermen matcher det nye ikonet.
   - Sikre at både standard og maskable ikonpekere fungerer sømløst.

3. **`/index.html`**:
   - Oppdatere `<meta name="theme-color" content="#0b1d3a" />` for konsistent mobilstatuslinje.
   - Bekrefte at `apple-touch-icon` og `favicon` peker korrekt.

---

## 4. Verifisering & Testplan

1. **Visuell inspeksjon**: Verifisere ikonet i nettleseren og bekrefte proporsjoner, kontrast og sentrering.
2. **PWA & Manifest-sjekk**: Sikre at `manifest.json` er gyldig JSON og at referansene stemmer.
3. **App-kompilering**: Kjøre `compile_applet` for å bekrefte at prosjektet bygger uten feil.
