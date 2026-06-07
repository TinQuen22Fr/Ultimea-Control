# AuraControl — PRD

## Vision
Télécommande Android avancée pour la barre de son **Ultimea Aura A40**, plus complète que
l'app officielle. Le protocole Bluetooth (BLE) étant inconnu, l'app permet de le **découvrir**
puis de **piloter** la barre avec une interface premium.

## Cible
- Plateforme : Android 14/15 (Expo SDK 54, React Native)
- Connexion : Bluetooth Low Energy (`react-native-ble-plx`)
- ⚠️ Le BLE fonctionne uniquement sur **build Android réel** (pas Expo Go / aperçu web).

## Fonctionnalités (livrées — MVP)
1. **Télécommande** : dial de volume circulaire (geste + haptique), Volume ±, Muet, Marche/Arrêt,
   Modes son (Dolby Atmos virtuel, 7.1 Surround, Cinéma, Musique, Stéréo, Nuit),
   Sources (Optique/Toslink, Bluetooth, AUX). Chaque bouton envoie la commande BLE liée.
2. **Explorateur BLE** : scan (RSSI + détection « Aura »), connexion, exploration des services/
   caractéristiques GATT, actions Lire / Tester (HEX) / Notifier, terminal de logs en direct,
   sauvegarde d'une commande découverte (nom, catégorie, payload HEX).
3. **Égaliseur** : 5 presets seedés (Plat, Cinéma, Musique, Voix, Boost Basses), réglage direct
   Basses/Aigus (commandes BLE liées), courbe 5 bandes + tonalité, enregistrement de presets.
4. **Bibliothèque** : commandes enregistrées + **assignation** des commandes aux boutons de la
   télécommande (bindings), suppression, stats.

## Backend (FastAPI + MongoDB)
Collections : `commands`, `bindings`, `profiles` (seed 5), `devices` (snapshot GATT), `logs`, `macros`.
CRUD complet, un seul profil actif à la fois, presets par défaut non supprimables.
Tous les endpoints préfixés `/api`. Aucune authentification.

## Permissions Android
BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION — demandées contextuellement
avec gestion refus/blocage (Ouvrir les réglages).

## État
- MVP complet et testé : 31/31 tests backend, flux frontend validés.
- BLE temps réel à valider par l'utilisateur sur build Android réel.

## Idées futures (non implémentées)
- Macros multi-commandes (séquences) exposées dans l'UI.
- Import/export du protocole découvert (partage entre utilisateurs Aura A40).
- Widget / raccourcis rapides.
