import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import {
  buildExt,
  type ESBuildFactoryOptions,
  watchExt,
} from '@moonlight-mod/esbuild-config'
import type { Plugin, PluginBuild } from 'esbuild'

const hanfixDataPlugin: Plugin = {
  name: 'hanfix-data',
  setup(build: PluginBuild) {
    build.onResolve({ filter: /^hanfix:data$/ }, (args) => ({
      path: args.path,
      namespace: '\0hanfix-data-ns',
    }))

    build.onLoad({ filter: /.*/, namespace: '\0hanfix-data-ns' }, async () => {
      const dataDir = path.resolve('src', 'hanfix')

      async function getSimpTradMappings() {
        const fstream = createReadStream(
          path.join(dataDir, 'Unihan_Variants.txt'),
        )
        const rl = readline.createInterface({
          input: fstream,
          crlfDelay: Infinity,
        })

        const t2s: Record<number, number> = {}
        const s2t: Record<number, number> = {}

        for await (const line of rl) {
          if (line.startsWith('#')) continue

          const [character, variant, data] = line.split('\t')

          let targetRecord: Record<number, number>

          switch (variant) {
            case 'kSimplifiedVariant':
              targetRecord = t2s
              break
            case 'kTraditionalVariant':
              targetRecord = s2t
              break
            default:
              continue
          }

          const characterNumber = Number.parseInt(character.substring(2), 16)
          const dataNumber = Number.parseInt(data.substring(2), 16)

          if (characterNumber !== dataNumber)
            targetRecord[characterNumber] = dataNumber
        }

        return { t2s, s2t }
      }

      async function getKanjidic() {
        type CodepointEntry = { type: string; value: string }
        type KanjidicCharacter = { codepoints: CodepointEntry[] }
        type KanjidicJson = { characters: KanjidicCharacter[] }

        const jsonData = await fs.readFile(
          path.join(dataDir, 'kanjidic2-all-3.6.2.json'),
          'utf-8',
        )
        const json = JSON.parse(jsonData) as KanjidicJson

        const k: Record<number, true> = {}

        for (const char of json.characters) {
          const codepoints = char.codepoints

          const ucs = codepoints.find((cp) => cp.type === 'ucs')
          if (ucs !== undefined) {
            const ucsInt = Number.parseInt(ucs.value, 16)
            k[ucsInt] = true
          }
        }

        return k
      }

      const [mappings, kanjidic] = await Promise.all([
        getSimpTradMappings(),
        getKanjidic(),
      ])

      // parsing is significantly faster than dumping a raw object lol
      const contents = `
export const traditionalToSimplified = Object.freeze(JSON.parse('${JSON.stringify(mappings.t2s)}'));
export const simplifiedToTraditional = Object.freeze(JSON.parse('${JSON.stringify(mappings.s2t)}'));
export const kanjidic = Object.freeze(JSON.parse('${JSON.stringify(kanjidic)}'));
`

      return { contents, loader: 'js' }
    })
  },
}

const esm: string[] = []

const watch = process.argv.includes('--watch')
const clean = process.argv.includes('--clean')

if (clean) {
  await fs.rm('./dist', { recursive: true, force: true })
} else {
  const exts = await fs.readdir('./src')

  for (const ext of exts) {
    const cfg: Omit<ESBuildFactoryOptions, 'side' | 'src' | 'dst'> = {
      ext,
      entry: path.resolve(path.join('src', ext)),
      output: path.resolve(path.join('dist', ext)),
      esm: esm.includes(ext),
      extraPlugins: [hanfixDataPlugin],
    }

    if (watch) {
      // @ts-expect-error src and dest are deprecated
      await watchExt(cfg)
    } else {
      // @ts-expect-error src and dest are deprecated
      await buildExt(cfg)
    }
  }
}
