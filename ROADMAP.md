# ROADMAP — MiroResult
**Version :** 1.0.0
**Date :** 2026-04-09
**Basé sur :** PRD v1.0.0 du 2026-04-08

---

## Légende

| Symbole | Statut |
|---------|--------|
| ⬜ | À faire |
| 🔄 | En cours |
| ✅ | Terminé |
| 🚫 | Bloqué |

---

## Phase 0 — Initialisation du projet
> Objectif : repo fonctionnel, stack en place, dev opérationnel

- ✅ Créer la structure de dossiers (`api/`, `frontend/`, `documents/`)
- ✅ Initialiser le projet Node.js/Express (`api/package.json`)
- ✅ Initialiser le projet React + Vite + TailwindCSS (`frontend/`)
- ✅ Configurer Prisma + SQLite (`prisma/schema.prisma`)
- ✅ Créer `.env.example` (variables : `PORT`, `JWT_SECRET`, `UPLOAD_DIR`, `DATABASE_URL`)
- ✅ Créer `.gitignore` (`.env`, `node_modules/`, `uploads/`, `*.db`)
- ✅ Créer `CLAUDE.md` à la racine (conventions projet, stack, ports)
- ✅ Vérifier que frontend `:9903` et API `:9904` démarrent sans erreur

---

## Phase 1 — Authentification
> Objectif : login sécurisé, routes protégées

- ✅ Modèle Prisma `users` + migration
- ✅ Script de seed : création du compte admin initial
- ✅ Route `POST /api/auth/login` — validation Zod, hash bcrypt, émission JWT
- ✅ `authMiddleware` — vérification token JWT sur routes protégées
- ✅ `LoginPage.tsx` — formulaire email/mot de passe
- ✅ `AuthContext.tsx` — stockage token, état `isAuthenticated`
- ✅ Redirection automatique vers `/dashboard` si token valide
- ✅ Déconnexion (suppression token localStorage)

---

## Phase 2 — Import et stockage des simulations
> Objectif : l'utilisateur peut importer un fichier MiroFish et le retrouver en liste

- ✅ Modèle Prisma `simulations` + migration
- ✅ `upload.middleware.ts` — Multer, validation MIME (JSON), taille max 5 Mo
- ✅ Route `POST /api/simulations` — upload + parsing + stockage `raw_data`
- ✅ Route `GET /api/simulations` — liste des simulations de l'utilisateur
- ✅ Route `GET /api/simulations/:id` — détail d'une simulation
- ✅ `SimulationsPage.tsx` — liste + bouton d'import
- ✅ Composant `FileUploader` — drag & drop ou sélecteur fichier
- ✅ Affichage statut (`pending` / `processed` / `error`) avec badge coloré
- ✅ Format d'entrée MiroFish : JSON (legacy) + ZIP (dossier MiroFish complet)
- ✅ Import ZIP : extraction mémoire adm-zip, scoring adaptatif, rapport + recommandations auto-générés

---

## Phase 3 — Génération de rapport
> Objectif : chaque simulation produit un rapport scoré et lisible

- ✅ Modèle Prisma `reports` + migration
- ✅ Définir l'algorithme de scoring (4 dimensions, poids 25% chacun)
- ✅ `report.service.ts` — calcul `score_global`, `scores_detail`, `summary`
- ✅ Route `POST /api/reports` — génération depuis une simulation
- ✅ Route `GET /api/reports/:id` — lecture d'un rapport
- ✅ `ReportPage.tsx` — affichage structuré du rapport
- ✅ Composants : `ScoreGlobal`, `ScoreDetail` (barres de progression), `SummaryCard`
- ✅ Lien simulation → rapport depuis `SimulationsPage`

---

## Phase 4 — Recommandations
> Objectif : chaque rapport expose des recommandations priorisées

- ✅ Modèle Prisma `recommendations` + migration
- ✅ `recommendation.service.ts` — génération automatique depuis les scores du rapport
- ✅ Route `GET /api/recommendations?reportId=...` — liste par rapport
- ✅ Affichage dans `ReportPage` — triées par priorité (`high` → `medium` → `low`)
- ✅ Badge de priorité (couleur : rouge / orange / gris)

---

## Phase 5 — Export
> Objectif : l'utilisateur peut exporter son rapport

- ✅ Export JSON — route `GET /api/reports/:id/export/json`
- ✅ Export PDF — impression navigateur (`window.print()`)
- ✅ Boutons d'export dans `ReportPage`
- ✅ Mise en forme CSS print-friendly pour le PDF

---

## Phase 6 — Finitions & robustesse
> Objectif : app stable, sécurisée, prête à déployer

- ✅ `error.middleware.ts` — handler global Express (format JSON uniforme)
- ✅ Validation Zod sur toutes les routes (audit complet)
- ✅ Gestion des erreurs côté frontend (messages inline sur toutes les pages)
- ✅ `DashboardPage.tsx` — vue d'accueil post-login (4 stats + simulations récentes)
- ✅ Revue sécurité : headers HTTP (X-Frame-Options, X-Content-Type-Options…), uploads dans `api/uploads/` hors `public/`
- ✅ NavBar → Sidebar dark avec navigation Dashboard / Simulations / Déconnexion
- ✅ Design system appliqué — charte graphique complète (palette, typographie, composants utilitaires)
- ✅ Mise à jour `CLAUDE.md` avec retours d'implémentation

---

## Phase 7 — Déploiement
> Objectif : app accessible en production sur Debian 12

- ✅ Configuration Nginx (`deploy/nginx.conf` — reverse proxy `/api/` → :9904, `/` → :9903)
- ✅ Configuration PM2 (`deploy/ecosystem.config.js` — 2 processus, logs, autorestart)
- ✅ Variables d'environnement production (`deploy/env.production.example`)
- ⬜ Migration base de données production — commande : `cd api && npx prisma migrate deploy`
- ⬜ Smoke test en prod (login, import, rapport, export)

---

## Hors périmètre v1 (à ne pas implémenter)

- Multi-utilisateurs
- Intégration IA
- Paiement
- Partage de rapport public
- Notifications email

---

## Points de décision — Résolutions

| # | Sujet | Décision |
|---|-------|----------|
| 1 | Format fichier MiroFish | **JSON** (legacy, schéma MiroFish) + **ZIP** (dossier complet MiroFish) |
| 2 | Algorithme de scoring | **4 dimensions** (biomass, mortality, growth, feedConversion), **poids 25% chacun**, clamp 0–100 |
| 3 | Export PDF | **`window.print()`** — pas de lib externe, CSS print intégré |
| 4 | DB production | **SQLite** — migration PostgreSQL possible mais non planifiée v1 |