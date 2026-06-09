# AuraControl — PRD

## Vision
Télécommande Android avancée pour la barre de son **Ultimea Aura A40**, plus complète que
l'app officielle. Le protocole Bluetooth (BLE) étant propriétaire, l'app permet de le
**découvrir** (sans PC) puis de **piloter** la barre avec une interface premium.

## Cible
- Plateforme : Android 14/15 (Expo SDK 54, React Native)
- Connexion : Bluetooth Low Energy (`react-native-ble-plx`)
- ⚠️ Le BLE (scan/connexion/notif/écriture) fonctionne uniquement sur **build Android réel**
  (pas Expo Go / aperçu web). L'APK est compilé via GitHub Actions (`.github/workflows/android.yml`).

## Protocole décodé (Ultimea Aura A40) — COMPLET, confirmé en conditions réelles
- En-tête **`AA` = commande** (téléphone → barre, **confirmé** : Optique AA change bien la source).
  En-tête **`BB` = réponse/statut** (barre → téléphone, capturé via notifications).
- Trame : `<entête> 01 00 <groupe> <param> <valeur> <checksum>`
- **Checksum** = `0xAA + somme des octets à partir de l'index 2` (l'en-tête ET l'octet de type
  ne sont PAS sommés). Vérifié sur 29/29 trames réelles (AA et BB). Cf. `auraChecksum`.

| Fonction | Trame commande (AA) | Mapping |
|---|---|---|
| Modes son | `AA 01 00 01 08 0X` | Movie=01, Music=02, Voice=03, Sport=04, Night=05, Game=06 |
| Volume | `AA 01 00 02 03 XX` | valeur absolue (ex. 0x11=17) |
| Source | `AA 01 00 02 02 0X` | OPT=01, BT=02, AUX=03, USB=04 |
| Muet | `AA 01 00 02 0A 0X` | muet=00, son=01 |
| LED Dimmer | `AA 01 00 02 0C 01` | — |

- UUID de la barre : service `27758daa-…`, caractéristique d'écriture `27758d11-…`.
- ✅ **Auto-câblage effectué (2026-06-10)** : 14 boutons liés en AA côté serveur (modes ×6,
  sources ×4, muet, LED, volume ±). L'utilisateur n'a qu'à rafraîchir l'app.
- ⚠️ À peaufiner au prochain build APK : volume **lisse** (dial absolu, déjà codé) au lieu des
  niveaux fixes 17/16 ; **bascule muet/son** (0A 00 ↔ 0A 01) au lieu de muet seul.
- Helpers : `/app/frontend/src/ble/hex.ts` → `AURA_PREFIX`, `auraChecksum`, `buildAuraFrame`.

## Fonctionnalités livrées
1. **Pilotage (Télécommande)** — calquée 1:1 sur la télécommande physique :
   Power, LED Dimmer, Muet · dial de volume + Volume ± · Lecture/Pause, Précédent, Suivant ·
   Sources (Source cycle, Optique/OPT, AUX, BT, USB) · Modes son (Movie, Music, Voice, Sport,
   Game, Night) · Réglages audio en steppers (Basses, Médiums, Aigus, Surround, Prompt Tone) ·
   Système (USB Repeat, EQ Reset, Device Reset). Chaque bouton envoie la commande BLE liée ;
   les boutons non liés affichent un toast d'invite.
   - **Volume en valeur absolue** : le dial et Volume ± envoient `AA 01 00 02 03 <valeur>`
     (Param 03 confirmé), la valeur 0–100 du dial étant mappée sur 0..`AURA_VOLUME_MAX` (=38,
     ajustable dans `controls.ts`). Cible d'écriture = char d'une commande Volume liée, sinon
     1er char inscriptible. Envoi anti-rebond (180 ms).
2. **Atelier (découverte du protocole, sans PC)** :
   - **Capture** : écoute toutes les caractéristiques notifiables ; l'utilisateur appuie sur
     sa télécommande (BT) et le code reçu s'affiche → « Enregistrer » en 1 clic.
   - **Enregistrer + Associer** : à l'enregistrement, on peut choisir directement le bouton
     (Muet, AUX, Movie…) auquel lier la commande, sans repasser par la Bibliothèque.
   - **Constructeur de trames** : préfixe `AA 01 00 02` éditable + Param + Valeur, **checksum
     calculé automatiquement**, sélection de la caractéristique d'écriture, Envoyer / Enregistrer,
     incrément ±1 pour balayer les fonctions.
   - **Exporter** : bouton « Exporter » → compile captures + commandes en un seul lot, ouvre le
     partage natif (Share) ET enregistre côté serveur (`POST /api/export`) pour relecture directe.
3. **Explorateur BLE** : scan, connexion, exploration GATT, Lire/Tester(HEX)/Notifier, terminal de logs.
4. **Égaliseur** : 5 presets seedés, réglage direct Basses/Aigus, courbe 5 bandes, enregistrement de presets.
5. **Bibliothèque** : commandes enregistrées + **assignation** des commandes aux ~32 boutons
   (bindings), suppression (cascade sur les bindings), stats.

## Backend (FastAPI + MongoDB)
Collections : `commands`, `bindings`, `profiles` (seed 5), `devices`, `logs`, `macros`, `exports`.
CRUD complet, un seul profil actif à la fois, presets par défaut non supprimables.
Export : `POST /api/export` (enregistre un lot captures+commandes), `GET /api/export` (dernier lot),
`GET /api/exports` (liste). Endpoints préfixés `/api`. Aucune authentification.

## État (juin 2026)
- MVP + refonte télécommande + Atelier + export + volume absolu : testés.
  - Backend : 32/32 pytest ✓ (dont test export) + flux create→bind→cascade-delete + POST/GET
    `/api/export` vérifiés via URL externe ✓.
  - Frontend (aperçu web, 390x844) : 5 onglets, refonte Pilotage (volume +), Atelier (état
    déconnecté + navigation), lint propre, aucun crash — smoke test OK.
- ✅ La télécommande de la barre est en **Bluetooth** (pas infrarouge) : l'analyseur Atelier
  capture bien les codes (confirmé par l'utilisateur en conditions réelles).
- ⚠️ Les flux BLE en direct (capture, envoi de trames, volume absolu, export via Share) sont
  pleinement validables sur **build Android réel** (APK GitHub Actions à recompiler).

## Notes de découverte
- **Constructeur de trames** = méthode fiable (sondage actif : on envoie, on observe la barre).
- **Capture par notifications** = bonus, fonctionne si la barre émet des notifications d'état.
- **Route Wireshark/terminal** (capture des écritures de l'app officielle) = repli ; pour cibler
  le dernier log btsnoop sans se tromper de fichier :
  `LOG=$(find . -iname "btsnoop_hci*.log" -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)`
  puis `tshark -r "$LOG" -Y "btatt.opcode==0x12 || btatt.opcode==0x52" -T fields -e btatt.value`.

## Backlog / idées futures
- P1 : Macros multi-commandes (séquences) exposées dans l'UI (backend `macros` déjà prêt).
- P2 : Mode hors-ligne / stockage local des commandes (APK 100% autonome sans backend).
- P3 : Import/export du protocole découvert (partage entre utilisateurs Aura A40).
- P3 : Widget / raccourcis rapides.
