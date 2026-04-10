# CLEANUP — MiroResult

> Rapport généré le 2026-04-10
> Aucun fichier supprimé — rapport uniquement.

---

## Résumé

| Catégorie | Éléments | Taille estimée |
|-----------|----------|---------------|
| Pages frontend orphelines | 3 fichiers | ~12 KB |
| Images non référencées | 5 fichiers | ~2.0 MB |
| Dossiers vides (scaffold initial) | 6 dossiers | 0 B |
| Fichiers `.gitkeep` redondants | 7 fichiers | 0 B |
| Documents obsolètes | 2 fichiers | ~12 KB |
| Fichiers racine orphelins | 2 fichiers | ~5 KB |
| **Total récupérable** | | **~2.0 MB** |

---

## 1. Pages frontend orphelines

Ces 3 pages existent mais ne sont importées nulle part (absentes de `App.tsx` et de tout autre fichier).
Le projet est admin-only — pas d'inscription, pas de réinitialisation de mot de passe prévue en v1.

| Fichier | Raison |
|---------|--------|
| `frontend/src/features/auth/ForgotPasswordPage.tsx` | Aucun import, aucune route déclarée |
| `frontend/src/features/auth/RegisterPage.tsx` | Aucun import, aucune route déclarée |
| `frontend/src/features/auth/ResetPasswordPage.tsx` | Aucun import, aucune route déclarée |

---

## 2. Images non référencées

Ces fichiers sont dans `frontend/public/img/` mais ne sont référencés dans aucun fichier source
(`.tsx`, `.ts`, `index.html`, `vite.config.ts`).

Les fichiers **utilisés** à conserver :
- `/img/faviconT.png` — référencé dans `ProtectedRoute.tsx`
- `/img/logoT.png` — référencé dans `LoginPage.tsx`
- `/img/app/favicon-96x96.png`, `favicon.svg`, `favicon.ico` — référencés dans `index.html`
- `/img/app/apple-touch-icon.png` — référencé dans `index.html`
- `/img/app/site.webmanifest` — référencé dans `index.html`
- `/img/app/web-app-manifest-192x192.png`, `web-app-manifest-512x512.png` — référencés dans le manifest

| Fichier | Taille |
|---------|--------|
| `frontend/public/img/logo.png` | 160 KB |
| `frontend/public/img/favicon.png` | 488 KB |
| `frontend/public/img/logoTT.png` | 148 KB |
| `frontend/public/img/image_1775726403064_876sat.png` | 1.0 MB |
| `frontend/public/img/image_1775726500675_uv6uiw.png` | 240 KB |
| **Total** | **~2.0 MB** |

---

## 3. Dossiers vides (scaffold initial)

Ces dossiers ont été créés au scaffold initial mais n'ont jamais été remplis.
Ils contiennent uniquement un `.gitkeep`. Le projet n'utilise pas ces patterns (controllers, models, layout, hooks, config frontend, types frontend).

| Dossier | Contenu |
|---------|---------|
| `api/src/controllers/` | `.gitkeep` uniquement — pattern controllers jamais utilisé |
| `api/src/models/` | `.gitkeep` uniquement — ORM Prisma utilisé à la place |
| `frontend/src/components/layout/` | `.gitkeep` uniquement — composant layout jamais créé |
| `frontend/src/config/` | `.gitkeep` uniquement — config toujours dans `.env` |
| `frontend/src/hooks/` | `.gitkeep` uniquement — aucun hook custom créé |
| `frontend/src/types/` | `.gitkeep` uniquement — types définis dans les composants directement |

---

## 4. Fichiers `.gitkeep` redondants

Ces `.gitkeep` sont dans des dossiers non-vides — ils perdent leur utilité (Git les ignore quand le dossier a d'autres fichiers).
Suppression cosmétique, aucun impact fonctionnel.

| Fichier |
|---------|
| `api/src/routes/.gitkeep` |
| `api/src/services/.gitkeep` |
| `api/src/middleware/.gitkeep` |
| `api/src/types/.gitkeep` |
| `frontend/src/components/common/.gitkeep` |
| `frontend/src/components/ui/.gitkeep` |
| `frontend/src/features/admin/.gitkeep` |

---

## 5. Documents obsolètes

| Fichier | Raison |
|---------|--------|
| `CONTEXT.md` | Figé au 2026-04-08 (état "projet initialisé via scaffold") — entièrement supersédé par `CLAUDE.md` |
| `DECISIONS.md` | Figé au 2026-04-08, jamais mis à jour — décisions intégrées dans `CLAUDE.md` ; note erreur : mentionne PostgreSQL alors que le projet utilise SQLite |
| `documents/structure-2026-04-08.md` | Structure initiale du scaffold, très éloignée de la structure actuelle |

---

## 6. Fichiers racine orphelins

| Fichier | Raison |
|---------|--------|
| `constants.deploy.js` | Listé dans `.gitignore` (ligne 22) mais commité par inadvertance lors de l'init. N'est importé par aucun script — il s'agit d'un template de config de déploiement rempli manuellement. |
| `prompt-mirofish.md` | Prompt de génération MiroFish (outil externe). Non référencé dans le projet, appartient à la toolchain MiroFish et non à MiroResult. |

---

## Note : manifest PWA — chemin cassé (bonus)

Le fichier `frontend/public/img/app/site.webmanifest` référence les icônes avec des chemins relatifs à la racine :
```json
{ "src": "/web-app-manifest-192x192.png" }
```
Or les fichiers sont à `/img/app/web-app-manifest-192x192.png`.
Les icônes PWA ne seront pas chargées par les navigateurs. Ce n'est pas un fichier orphelin mais une anomalie de chemin.
