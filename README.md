# MiroResult

> **FR** — Outil de lecture et valorisation des outputs MiroFish. Transforme les données brutes de simulation multi-agents en rapports décisionnels visuels, générés par IA.
>
> **EN** — A tool for reading and visualizing MiroFish simulation outputs. Transforms raw multi-agent simulation data into AI-generated visual decision reports.

---

## Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Tailwind CSS, React Router v6, Zustand, Axios |
| Backend | Express, TypeScript, Prisma, SQLite, JWT |

---

## Démarrage / Getting Started

### Prérequis / Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Cloner le dépôt / Clone the repo
git clone https://github.com/CyrilDEVIA/MiroResult.git
cd MiroResult

# Installer les dépendances / Install dependencies
npm install

# Démarrer en développement / Start in development
npm run dev
```

Frontend : `http://localhost:9903`  
API : `http://localhost:9904`

---

## Configuration IA / AI Configuration

MiroResult supporte tout provider compatible OpenAI (OpenRouter, Mistral, Groq, Anthropic, DeepSeek, Z.ai…).  
*MiroResult supports any OpenAI-compatible provider (OpenRouter, Mistral, Groq, Anthropic, DeepSeek, Z.ai…).*

Dans l'interface, rendez-vous dans **Paramètres → Providers IA** pour configurer :  
*In the app, go to **Settings → AI Providers** to configure:*

- Nom du provider / Provider name
- URL de base / Base URL (ex: `https://api.z.ai/api/paas/v4`)
- Clé API / API key
- Modèle / Model (ex: `claude-sonnet-4-6`, `glm-4.7`, `deepseek-chat`)

> ⚠️ Les clés API ne sont jamais exposées au frontend.  
> ⚠️ API keys are never exposed to the frontend.

---

## Fonctionnalités / Features

- 📥 Import ZIP des simulations MiroFish
- 🤖 Analyse IA avec double passe critique (analyse + auto-critique)
- 📊 Rapport HTML visuel généré par le LLM (graphiques SVG inline)
- 🔄 Historique et comparaison de rapports
- 🔌 Multi-providers IA configurables
- 🔐 Authentification JWT

---

## Conventions

```
src/
├── features/{feature}/     # Pages et logique métier
│   └── NomPage.tsx
├── components/
│   ├── ui/                 # Composants réutilisables
│   └── common/             # Composants génériques
```

- Zéro `.jsx` / `.js` dans `src/` — uniquement `.tsx` et `.ts`
- TypeScript strict, zéro `any`
- Zod sur toutes les routes API

---

## Avant déploiement / Before deployment

```bash
# 1. Copier et remplir les variables d'environnement
#    Copy and fill environment variables
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env

# 2. Editer les fichiers .env avec vos valeurs
#    Edit the .env files with your values
nano api/.env
nano frontend/.env
```

---

## Licence / License

MIT