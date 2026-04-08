# DECISIONS — MiroResult
> Dernière mise à jour : 2026-04-08
> Source de vérité des décisions techniques. Lu par l'orchestrateur à chaque session.

---

## Stack & Technologies

| Sujet | Décision | Raison |
|-------|----------|--------|
| Stack | React + TypeScript + Node.js | — |
| HTTP Framework | Express | Standard |
| HTTP client | Axios | Intercepteurs JWT, gestion erreurs |
| State management | Zustand | Simple, pas de boilerplate |
| Routing | React Router v6 | Standard |
| ORM | Prisma | — |
| Auth | JWT (access + refresh) | — |
| Base de données | PostgreSQL | — |
| CSS | Tailwind CSS | — |
| Emails | — | — |

---

## Contraintes transversales

- [ ] Responsive : toutes les vues doivent être responsive (mobile-first)
- [ ] Variables d'env : toute nouvelle variable ajoutée dans .env.local (et .env)
- [ ] Zéro donnée hardcodée — toujours Prisma/SQL/API, jamais de tableaux fictifs dans le code
- [ ] Fichiers _TMP_ supprimés avant prod
- [ ] Commits en français, format conventional commits
- [ ] Imports via alias @/ uniquement (jamais de chemins relatifs ../../)
- [ ] Pas de fetch natif — utiliser l'instance Axios configurée dans services/api.ts
- [ ] Zéro fichier .jsx ou .js dans src/ — uniquement .tsx et .ts
- [ ] Pages nommées en PascalCase avec suffixe Page (ex: LoginPage.tsx)
- [ ] Pages rangées dans features/{feature}/ (ex: features/auth/LoginPage.tsx)

---

## Fonctionnalités — État d'avancement

| Fonctionnalité | État | Notes |
|----------------|------|-------|
| — | ⏳ À faire | — |

Légende : ⏳ À faire · 🔄 En cours · ✅ Terminé · ❌ Abandonné · ⚠️ Problème

---

## Notes de session

- 2026-04-08 — Projet initialisé
