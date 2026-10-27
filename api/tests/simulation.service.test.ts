import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'
import {
  extractAndParseZip,
  computeScore,
  summarizeZip,
  generateZipRecommendations,
} from '../src/services/simulation.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Crée un ZIP temporaire à partir d'un mapping nom de fichier → contenu. */
async function makeZip(files: Record<string, string | unknown>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'miroresult-test-'))
  const filePath = join(dir, 'archive.zip')

  const zip = new AdmZip()
  for (const [name, content] of Object.entries(files)) {
    const raw = typeof content === 'string' ? content : JSON.stringify(content)
    zip.addFile(name, Buffer.from(raw, 'utf8'))
  }
  zip.writeZip(filePath)

  return filePath
}

async function withZip<T>(
  files: Record<string, string | unknown>,
  run: (parsed: ReturnType<typeof extractAndParseZip>) => T | Promise<T>
): Promise<T> {
  const filePath = await makeZip(files)
  try {
    return await run(extractAndParseZip(filePath))
  } finally {
    await rm(filePath, { force: true })
    await rm(join(filePath, '..'), { recursive: true, force: true })
  }
}

const SUMMARY_COMPLETE =
  'Simulation complète et bien structurée. Les données sont exploitables pour analyse.'
const SUMMARY_INCOMPLETE =
  "Simulation incomplète. Des fichiers essentiels ou des preuves d'exécution sont absents — vérifiez l'export MiroFish."

// ─── Cas de régression : archive quasi vide ──────────────────────────────────

test('archive incomplète (simulation_config {} + state {}) → scores à 0, résumé incomplet, aucune reco positive', async () => {
  await withZip(
    {
      'simulation_config.json': {},
      'state.json': {},
    },
    (parsed) => {
      const scores = computeScore(parsed)

      assert.equal(scores.dimensions.activity, 0, 'activity doit valoir 0')
      assert.equal(scores.dimensions.reach, 0, 'reach doit valoir 0')
      assert.equal(scores.dimensions.configuration, 0, 'configuration {} doit valoir 0')
      assert.equal(scores.dimensions.completion, 0, 'completion doit valoir 0')
      assert.equal(scores.global, 0, 'global doit valoir 0')

      const summary = summarizeZip(scores)
      assert.equal(summary, SUMMARY_INCOMPLETE)
      assert.match(summary, /incomplète/)

      const recs = generateZipRecommendations(scores)
      assert.ok(recs.length > 0, 'des recommandations de manque doivent être produites')
      assert.ok(
        recs.every((r) => r.priority !== 'low'),
        'aucune recommandation positive (priority low) ne doit être produite'
      )
      assert.ok(
        recs.every((r) => !r.content.includes('complète et bien structurée')),
        'aucun message positif ne doit être produit'
      )
      assert.ok(
        recs.every((r) => !/augmenter le nombre d'agents|durée de simulation/i.test(r.content)),
        "on ne doit pas recommander d'augmenter les agents/rounds quand les preuves sont absentes"
      )
      assert.ok(
        recs.some((r) => /run_state\.json/i.test(r.content)),
        'la recommandation sur run_state.json doit être présente'
      )
    }
  )
})

// ─── Cas valide : bits présents ──────────────────────────────────────────────

test('archive complète (config, profils, actions, run_state completed) → résumé positif', async () => {
  const profiles = Array.from({ length: 20 }, (_, i) => ({ id: i, personality: `type-${i % 4}` }))
  const actions = Array.from({ length: 50 }, (_, i) => JSON.stringify({ step: i + 1, opinion: 0.5 })).join('\n')

  await withZip(
    {
      'simulation_config.json': { species: 'salmon', period: '2026', metrics: {} },
      'run_state.json': { runner_status: 'completed' },
      'profiles.json': profiles,
      'actions.jsonl': actions,
    },
    (parsed) => {
      const scores = computeScore(parsed)

      assert.equal(scores.dimensions.activity, 100)
      assert.equal(scores.dimensions.reach, 100)
      assert.equal(scores.dimensions.configuration, 100)
      assert.equal(scores.dimensions.completion, 100)
      assert.equal(scores.global, 100)

      assert.equal(summarizeZip(scores), SUMMARY_COMPLETE)

      const recs = generateZipRecommendations(scores)
      assert.ok(
        recs.some((r) => r.priority === 'low' && r.content.includes('complète et bien structurée')),
        'une recommandation positive doit être produite'
      )
    }
  )
})

// ─── Complétion : statut run_state et non state.json ─────────────────────────

test('completion : runner_status insensible à la casse, autres statuts et state.json ignorés', async () => {
  // run_state absent → 0
  await withZip({ 'simulation_config.json': { species: 'salmon' } }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.completion, 0)
  })

  // state.status === "ready" ne prouve PAS la fin de simulation
  await withZip(
    { 'simulation_config.json': { species: 'salmon' }, 'state.json': { status: 'ready' } },
    (parsed) => {
      assert.equal(computeScore(parsed).dimensions.completion, 0)
    }
  )

  // run_state vide / statut autre → 0
  await withZip({ 'run_state.json': {} }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.completion, 0)
  })
  await withZip({ 'run_state.json': { runner_status: 'running' } }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.completion, 0)
  })

  // casse différente → 100
  await withZip({ 'run_state.json': { runner_status: 'COMPLETED' } }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.completion, 100)
  })
})

// ─── Configuration : objet vide / non-objet → 0 ──────────────────────────────

test('configuration : {} et non-objet valent 0, objet non vide vaut 100', async () => {
  await withZip({ 'simulation_config.json': {} }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.configuration, 0)
  })
  await withZip({ 'simulation_config.json': [] }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.configuration, 0)
  })
  await withZip({ 'simulation_config.json': { species: 'salmon' } }, (parsed) => {
    assert.equal(computeScore(parsed).dimensions.configuration, 100)
  })
})
