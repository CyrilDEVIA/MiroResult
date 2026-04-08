# MiroResult

## Démarrage dev
```bash
npm install
npm run dev
```

## Stack
- **Frontend** : React 18, TypeScript, Tailwind CSS, React Router v6, Zustand, Axios
- **Backend** : Express, TypeScript, Prisma, JWT

## Conventions
- Zéro .jsx/.js dans src/ — uniquement .tsx et .ts
- Pages dans features/{feature}/NomPage.tsx

## Avant déploiement
1. Remplir `constants.deploy.js`
2. Remplir `api/.env` et `frontend/.env`
3. Lancer `node ~/.claude/skills/6-prod/generate-configs.js`