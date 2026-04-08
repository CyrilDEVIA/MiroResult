# CONTEXT — MiroResult
> Lis ce fichier EN PREMIER à chaque nouvelle session, avant tout autre chose.
> Mis à jour à chaque fin de prompt significatif.

---

## 📍 Où on en est
- **Dernière session** : 2026-04-08
- **Dernière action** : Projet initialisé via scaffold
- **Prochain truc à faire** : Remplir les ports dans PORTS.md et constants.deploy.js

---

## ✅ Fichiers déjà créés et stables
> Ne jamais réécrire ces fichiers sauf demande explicite.
- Structure de base générée par scaffold

---

## 🚫 Contraintes actives
> Ces règles sont non-négociables, même si tu ne les vois plus dans la conversation.
- TypeScript strict — zéro `any`, zéro `as unknown`
- Imports via `@/` uniquement — jamais de chemins relatifs `../../`
- HTTP via l'instance Axios de `services/api.ts` — jamais `fetch` natif
- Zéro fichier `.jsx` ou `.js` dans `src/` — uniquement `.tsx` et `.ts`
- Pages : PascalCase + suffixe Page (LoginPage.tsx) dans features/{feature}/
- Convention VITE_API_URL : sans /api (le préfixe /api est dans chaque appel du code)

---

## 🔄 Décisions prises en session
| Sujet | Décision | Session |
|-------|----------|---------|
| — | — | — |

---

## ⚠️ Problèmes connus
| Problème | Statut |
|----------|--------|
| — | — |

---

## 📋 Instructions pour Claude
Tu lis ce fichier + `DECISIONS.md` + `CLAUDE.md` + le fichier sur lequel on travaille.
C'est tout ce dont tu as besoin pour repartir proprement.
Si tu vois un comportement bizarre de ta part (réécriture de fichiers stables,
introduction de `any`, oubli de contraintes), c'est que la fenêtre est saturée.
Dis-le à l'utilisateur : "Je pense que la fenêtre est saturée, ouvre une nouvelle session."
