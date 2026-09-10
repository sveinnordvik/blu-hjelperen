# Cloud Function for Vervesystemet (BLU-Hjelperen)

Denne Cloud Functionen håndterer automatisk utbetaling av Humanizer-vask til studenter når nye brukere registrerer seg via en vervelenke.

## Logikk og Flyt

1. **Trigger:** `onDocumentCreated` på `users/{userId}` i Firestore.
2. **Sjekk:** Funksjonen leser feltet `referredBy`. Hvis feltet mangler eller er tomt, avsluttes funksjonen.
3. **Sikkerhet:** Sjekker at `referredBy !== userId` (forhindrer selv-verving) og at bonusen ikke allerede er registrert som utbetalt.
4. **Utbetaling (Admin SDK):**
   - **Verver (`users/{referredBy}`):** `humanizerCredits: increment(10)` (+10 vask) og `totalReferrals: increment(1)`.
   - **Ny student (`users/{userId}`):** `humanizerCredits: increment(5)` (+5 vask) og `referralRewardProcessed: true`.
   - **Historikk:** Oppretter et dokument i `referrals`-kolleksjonen for full revisjon.

---

## Slik distribuerer (deployer) du funksjonen:

Fra rot-mappen i prosjektet ditt i terminalen:

```bash
# Gå til functions-mappen
cd functions

# Installer avhengigheter
npm install

# Deploy funksjonen til Firebase
firebase deploy --only functions:onUserCreatedRewardReferral
```

---

## Miljøkrav

- Node.js versjon 18 eller nyere.
- Firebase CLI installert og innlogget (`firebase login`).
