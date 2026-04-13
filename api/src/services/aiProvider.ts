import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import { z } from 'zod'
import { AppError } from '../types'
import { PROMPT_MIROFISH } from '../config/prompts'
import { LLM_TIMEOUT_MS } from '../config/constants'

const PROVIDERS_PATH = path.resolve(__dirname, '../../providers.json')

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

export interface ProvidersFile {
  active: string | null
  providers: Provider[]
}

// ─── Schéma Zod — nouveau format décisionnel ───────────────────────────────────

const analysisJsonSchema = z.object({
  verdict: z.object({
    decision: z.enum(['lancer', 'pivoter', 'abandonner']),
    score_viabilite: z.number().int().min(0).max(100),
    resume: z.string(),
  }),
  favorables: z.array(
    z.object({
      titre: z.string(),
      detail: z.string(),
      force: z.number().int().min(0).max(100),
    })
  ),
  blocages: z.array(
    z.object({
      titre: z.string(),
      detail: z.string(),
      severite: z.number().int().min(0).max(100),
    })
  ),
  composition: z.object({
    hommes_pct: z.number().int().min(0).max(100),
    femmes_pct: z.number().int().min(0).max(100),
    tranches_age: z.array(
      z.object({
        label: z.string(),
        pct: z.number().int().min(0).max(100),
      })
    ),
    profils: z.array(
      z.object({
        label: z.string(),
        pct: z.number().int().min(0).max(100),
      })
    ),
    territoire: z.string(),
  }),
  conditions_succes: z.array(z.string()),
  narrative: z.object({
    synthese: z.string(),
    dynamiques: z.string(),
  }),
})

export type AnalysisJson = z.infer<typeof analysisJsonSchema>

// ─── Providers ────────────────────────────────────────────────────────────────

export async function readProvidersFile(): Promise<ProvidersFile> {
  try {
    const content = await readFile(PROVIDERS_PATH, 'utf8')
    return JSON.parse(content) as ProvidersFile
  } catch {
    return { active: null, providers: [] }
  }
}

export async function writeActiveProvider(id: string): Promise<void> {
  try {
    const data = await readProvidersFile()
    data.active = id
    await writeFile(PROVIDERS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
  } catch {
    // Non-bloquant — l'analyse est déjà enregistrée
  }
}

// ─── Prompts système ───────────────────────────────────────────────────────────

const JSON_SCHEMA_DESCRIPTION = `{
  "verdict": {
    "decision": "lancer" | "pivoter" | "abandonner",
    "score_viabilite": 78,
    "resume": "2 phrases max, tranchées, actionnables — justifient la décision"
  },
  "favorables": [
    { "titre": "string", "detail": "string", "force": 85 }
  ],
  "blocages": [
    { "titre": "string", "detail": "string", "severite": 72 }
  ],
  "composition": {
    "hommes_pct": 45,
    "femmes_pct": 55,
    "tranches_age": [{ "label": "18-25", "pct": 20 }],
    "profils": [{ "label": "Entrepreneurs", "pct": 30 }],
    "territoire": "string"
  },
  "conditions_succes": ["string"],
  "narrative": {
    "synthese": "string",
    "dynamiques": "string"
  }
}`

const CONTRAINTES = `Contraintes absolues :
- AUCUN texte avant ou après le JSON. AUCUN backtick. AUCUN bloc markdown. Commence par "{" et termine par "}".
- "decision" : toujours tranché — "lancer", "pivoter" ou "abandonner". Jamais ambigu.
- "favorables" triés par "force" décroissante. Minimum 2, maximum 5.
- "blocages" triés par "severite" décroissante. Minimum 1, maximum 4.
- "score_viabilite" : entier 0–100, cohérent avec la decision.
- "resume" : 2 phrases maximum, directes, actionnables.
- "tranches_age" et "profils" : minimum 2 entrées chacun, total ~100%.
- "conditions_succes" : 2 à 4 conditions nécessaires au succès.
- Toutes les valeurs texte en FRANÇAIS.`


const SYSTEM_PROMPT_PASSE2 = `Tu es un expert en analyse de simulations multi-agents (MiroFish) pour des décisions d'investissement.
Tu reçois une première analyse JSON. Ta mission : la critiquer puis produire une version finale améliorée.

Questions de critique à appliquer :
- Les signaux favorables sont-ils suffisamment étayés par les données ? Sont-ils sur-estimés ?
- Les blocages sont-ils sous-estimés ou surestimés ? Manque-t-il un blocage critique ?
- La décision finale est-elle cohérente avec score_viabilite et les données brutes ?
- Le résumé est-il vraiment actionnable pour un décideur ou investisseur ?
- La composition démographique est-elle réaliste au regard des profils observés ?

Produis une version finale corrigée et améliorée au même format JSON.

${JSON_SCHEMA_DESCRIPTION}

${CONTRAINTES}`

// ─── Appel LLM bas niveau ─────────────────────────────────────────────────────

const DEV = process.env.NODE_ENV !== 'production'

async function callLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new AppError(`AI provider error ${res.status}: ${body.slice(0, 200)}`, 502)
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }

  if (!json.choices?.[0]?.message?.content) {
    throw new AppError('Réponse LLM invalide (choices vide)', 502)
  }

  const rawText = json.choices[0].message.content.trim()

  if (DEV) {
    console.log('[aiProvider] réponse brute LLM :', rawText.slice(0, 500))
  }

  let jsonBlock = rawText.replace(/```(?:json)?/gi, '').trim()
  const jsonMatch = jsonBlock.match(/\{[\s\S]*\}/)
  if (jsonMatch) jsonBlock = jsonMatch[0].trim()

  try {
    const parsed = analysisJsonSchema.parse(JSON.parse(jsonBlock))
    return JSON.stringify(parsed)
  } catch {
    if (DEV) {
      console.log('[aiProvider] JSON invalide — contenu extrait :', jsonBlock.slice(0, 1000))
    }
    throw new AppError('Le LLM n\'a pas retourné de JSON valide. Relancez l\'analyse ou vérifiez le provider.', 422)
  }
}

// ─── Pipeline 2 passes ────────────────────────────────────────────────────────

async function runTwoPasses(
  baseUrl: string,
  apiKey: string,
  model: string,
  simulationData: string
): Promise<{ analysis: string }> {
  // Passe 1 — analyse brute
  const pass1 = await callLLM(baseUrl, apiKey, model, PROMPT_MIROFISH, simulationData)

  // Passe 2 — auto-critique et consolidation
  const pass2 = await callLLM(baseUrl, apiKey, model, SYSTEM_PROMPT_PASSE2, pass1)

  return { analysis: pass2 }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries > 0) return withRetry(fn, retries - 1)
    throw err
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function analyzeSimulation(
  simulationData: string,
  provider: Pick<Provider, 'baseUrl' | 'apiKey' | 'model'>
): Promise<{ analysis: string }> {
  if (!provider.baseUrl || !provider.apiKey || !provider.model) {
    throw new AppError('Configuration IA incomplète. Vérifiez les champs du provider dans Paramètres.', 400)
  }

  return withRetry(() =>
    runTwoPasses(provider.baseUrl, provider.apiKey, provider.model, simulationData)
  )
}
