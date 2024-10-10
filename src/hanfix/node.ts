import unihan_variants from './Unihan_Variants.txt';

let t2s: Record<number, number> = {}
let s2t: Record<number, number> = {}

const lines: string[] = unihan_variants.split('\n')
for (const line of lines) {
  if(line.startsWith('#')) continue;

  const [character, variant, data] = line.split('\t')

  let targetRecord: Record<number, number>;

  switch(variant) {
    case 'kSimplifiedVariant':
      targetRecord = t2s;
      break;
    case 'kTraditionalVariant':
      targetRecord = s2t;
      break;
    default: continue;
  }

  let characterNumber = Number.parseInt(character.substring(2), 16);
  let dataNumber = Number.parseInt(data.substring(2), 16);

  if(characterNumber !== dataNumber)
    targetRecord[characterNumber] = dataNumber;
}

export const traditionalToSimplified = Object.freeze(t2s);
export const simplifiedToTraditional = Object.freeze(s2t);

import kanjidicJsonUntyped from './kanjidic2-all-3.5.0.json';

type CodepointEntry = { "type": string, "value": string }
type KanjidicCharacter = { "codepoints": CodepointEntry[] }
type KanjidicJson = { "characters": KanjidicCharacter[] }

const kanjidicJson: KanjidicJson = kanjidicJsonUntyped as KanjidicJson

let k: Record<number, undefined> = {};

for(const char of kanjidicJson.characters) {
  const codepoints = char.codepoints

  let ucs;
  if((ucs = codepoints.find(cp => cp.type == "ucs")) !== undefined) {
    const ucsInt = Number.parseInt(ucs.value, 16);
    k[ucsInt] = undefined;
  }
}

export const kanjidic = Object.freeze(k);
