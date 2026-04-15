# MiroResult

> **FR** — Outil de lecture et valorisation des outputs [MiroFish](https://github.com/666ghj/MiroFish). Transforme les données brutes de simulation multi-agents en rapports décisionnels visuels, générés par IA.
>
> **EN** — A tool for reading and visualizing [MiroFish](https://github.com/666ghj/MiroFish) simulation outputs. Transforms raw multi-agent simulation data into AI-generated visual decision reports.

![Dashboard](docs/screenshot-dashboard.png)
![Simulation](docs/screenshot-simulation.png)

---

## Comment ça fonctionne / How it works

```
MiroFish simulation
      │
      ▼
  Export ZIP
      │
      ▼
 MiroResult import
      │
      ▼
  Analyse IA (double passe critique)
      │
      ▼
  Rapport HTML visuel
      │
      ▼
  Chat itératif pour affiner le rapport
```

**FR**
1. Lancer une simulation dans [MiroFish](https://github.com/666ghj/MiroFish) et exporter les résultats en ZIP
2. Importer le ZIP dans MiroResult
3. L'IA analyse les données en deux passes (analyse + auto-critique)
4. Un rapport HTML exploitable est généré, avec graphiques SVG inline
5. Utiliser le chat intégré pour itérer et affiner le rapport

**EN**
1. Run a simulation in [MiroFish](https://github.com/666ghj/MiroFish) and export results as a ZIP
2. Import the ZIP into MiroResult
3. The AI analyses the data in two passes (analysis + self-critique)
4. A ready-to-use HTML report is generated, with inline SVG charts
5. Use the built-in chat to iterate and refine the report

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
- Une simulation [MiroFish](https://github.com/666ghj/MiroFish) exportée en ZIP
- *A [MiroFish](https://github.com/666ghj/MiroFish) simulation exported as ZIP*

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

Chaque utilisateur configure ses propres clés API directement dans l'interface.  
*Each user configures their own API keys directly in the interface.*

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
- 💬 Chat intégré pour itérer et affiner le rapport
- 🔄 Historique et comparaison de rapports
- 🔌 Multi-providers IA configurables par utilisateur
- 🔐 Authentification JWT

---

## Contribuer / Contributing

**FR**
MiroResult est un projet open source, fonctionnel mais perfectible. Si tu utilises MiroFish et que tu veux améliorer cet outil, les contributions sont les bienvenues — qu'il s'agisse de corriger un bug, d'améliorer l'interface, d'ajouter une langue ou de proposer une nouvelle fonctionnalité.

Axes d'amélioration identifiés :
- 🎨 Esthétique et ergonomie de l'interface
- 🌍 Support multilingue (actuellement FR/EN)
- 📄 Qualité et richesse des rapports générés
- 🧪 Tests automatisés
- 📦 Packaging / déploiement simplifié

**EN**
MiroResult is an open source project — functional, but with room to grow. If you use MiroFish and want to improve this tool, contributions are very welcome — bug fixes, UI improvements, new languages, new features, anything goes.

```bash
# Fork le dépôt, puis :
git checkout -b feature/ma-contribution
git commit -m "feat: ma contribution"
git push origin feature/ma-contribution
# Ouvre une Pull Request
```

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

## Lien / Related

- [MiroFish](https://github.com/666ghj/MiroFish) — le simulateur multi-agents dont MiroResult exploite les outputs / the multi-agent simulator whose outputs MiroResult processes

---

## Licence / License

MIT