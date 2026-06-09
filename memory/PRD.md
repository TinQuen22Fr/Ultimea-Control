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

## Protocole décodé (Ultimea Aura A30/A40)
- Format de trame : `AA 01 00 02 <param> <valeur> <checksum>`
  - `AA` = en-tête · `01` = type (SET) · `00 02` = groupe de commande
  - `<param>` = fonction (ex. `03` = volume) · `<valeur>` = valeur
  - `<checksum>` = somme de tous les octets SAUF l'en-tête et le checksum, modulo 256
- Helpers : `/app/frontend/src/ble/hex.ts` → `AURA_PREFIX`, `auraChecksum`, `buildAuraFrame`.

## Fonctionnalités livrées
1. **Pilotage (Télécommande)** — calquée 1:1 sur la télécommande physique :
   Power, LED Dimmer, Muet · dial de volume + Volume ± · Lecture/Pause, Précédent, Suivant ·
   Sources (Source cycle, Optique/OPT, AUX, BT, USB) · Modes son (Movie, Music, Voice, Sport,
   Game, Night) · Réglages audio en steppers (Basses, Médiums, Aigus, Surround, Prompt Tone) ·
   Système (USB Repeat, EQ Reset, Device Reset). Chaque bouton envoie la commande BLE liée ;
   les boutons non liés affichent un toast d'invite.
2. **Atelier (découverte du protocole, sans PC)** :
   - **Capture** : écoute toutes les caractéristiques notifiables ; l'utilisateur appuie sur
     sa télécommande physique et le code reçu s'affiche → « Enregistrer » en 1 clic.
   - **Constructeur de trames** : préfixe `AA 01 00 02` éditable + Param + Valeur, **checksum
     calculé automatiquement**, sélection de la caractéristique d'écriture, Envoyer / Enregistrer,
     incrément ±1 pour balayer les fonctions.
3. **Explorateur BLE** : scan, connexion, exploration GATT, Lire/Tester(HEX)/Notifier, terminal de logs.
4. **Égaliseur** : 5 presets seedés, réglage direct Basses/Aigus, courbe 5 bandes, enregistrement de presets.
5. **Bibliothèque** : commandes enregistrées + **assignation** des commandes aux ~32 boutons
   (bindings), suppression (cascade sur les bindings), stats.

## Backend (FastAPI + MongoDB)
Collections : `commands`, `bindings`, `profiles` (seed 5), `devices`, `logs`, `macros`.
CRUD complet, un seul profil actif à la fois, presets par défaut non supprimables.
Endpoints préfixés `/api`. Aucune authentification.

## État (juin 2026)
- MVP + refonte télécommande + Atelier : testés.
  - Backend : 31/31 pytest ✓ + flux create→bind→cascade-delete vérifié via URL externe ✓.
  - Frontend (aperçu web, 390x844) : 5 onglets, refonte Pilotage, Atelier (état déconnecté +
    navigation), Bibliothèque (32 bindings), EQ — tous validés par l'agent de test (itération 2).
- ⚠️ Les flux BLE en direct (capture par notifications, envoi de trames) ne sont validables que
  sur **build Android réel** avec la barre de son — à confirmer par l'utilisateur.

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
