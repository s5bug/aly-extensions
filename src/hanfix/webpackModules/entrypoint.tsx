import type {
  Capture,
  MarkdownRule,
  MatchFunction,
  ParseFunction,
  Parser,
  SingleASTNode,
  SingleNodeOutput,
  SlateRule,
  State,
} from '@moonlight-mod/types/coreExtensions/markdown'
import * as markdown from '@moonlight-mod/wp/markdown_markdown'
import React from '@moonlight-mod/wp/react'

const natives: {
  traditionalToSimplified: Readonly<Record<number, number>>
  simplifiedToTraditional: Readonly<Record<number, number>>
  kanjidic: Readonly<Record<number, undefined>>
} = moonlight.getNatives('hanfix')

type CjkLocale = 'ja-JP' | 'zh-CN' | 'zh-TW' | 'ko-KR'

type CjkAstNodeUnmergedPart = {
  locale: 'ja-JP' | 'ko-KR' | undefined
  content: string
}

type CjkAstNodeUnparsedPart = {
  locale: CjkLocale
  content: string
}

type CjkAstNodePart = {
  locale: CjkLocale
  content: SingleASTNode[]
}

type CjkAstNode = {
  content: string
  parts: CjkAstNodePart[]
}

const cjkRegex =
  /^(?:\p{sc=Han}|\p{sc=Katakana}|\p{sc=Hiragana}|\p{sc=Hangul}|[、，。])+/u

const cjkSegmentMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (
    source: string,
    state: State,
    _prevCapture: string,
  ) => {
    if (state.__moonlight_hanfix_incjk) return null
    return regex.exec(source)
  }
  f.regex = regex
  return f
})(cjkRegex)

const allCodepoints = (
  search: string,
  predicate: (codepoint: number) => boolean,
): boolean => {
  for (const character of search) {
    // biome-ignore lint/style/noNonNullAssertion: `character` is guaranteed to be non-empty
    const cpNum = character.codePointAt(0)!
    if (!predicate(cpNum)) return false
  }
  return true
}

const allInKanjidic = (search: string): boolean =>
  allCodepoints(search, (c) => c in natives.kanjidic)

const allCantBeMoreTraditional = (search: string): boolean =>
  allCodepoints(search, (c) => !(c in natives.simplifiedToTraditional))

const allCantBeMoreSimplified = (search: string): boolean =>
  allCodepoints(search, (c) => !(c in natives.traditionalToSimplified))

const alternativeRegex =
  /(?<zh>(\p{sc=Han}|[，。])+)|(?<ja>(?:\p{sc=Katakana}|\p{sc=Hiragana}|、)+)|(?<ko>\p{sc=Hangul}+)/uy

const pushNextCjkGroup = (
  rawGroups: CjkAstNodeUnmergedPart[],
  content: string,
): boolean => {
  const nextLanguageGroup = alternativeRegex.exec(content)
  if (nextLanguageGroup === null || nextLanguageGroup.groups === undefined) {
    alternativeRegex.lastIndex = 0
    return false
  } else {
    if (nextLanguageGroup.groups.ja !== undefined) {
      rawGroups.push({
        locale: 'ja-JP',
        content: nextLanguageGroup.groups.ja,
      })
    } else if (nextLanguageGroup.groups.ko !== undefined) {
      rawGroups.push({
        locale: 'ko-KR',
        content: nextLanguageGroup.groups.ko,
      })
    } else if (nextLanguageGroup.groups.zh !== undefined) {
      rawGroups.push({
        locale: undefined,
        content: nextLanguageGroup.groups.zh,
      })
    } else {
      throw new Error(`Failed to parse raw language groups: ${content}`)
    }
    return true
  }
}

const mergeCjkGroups = (
  mergedGroups: CjkAstNodeUnparsedPart[],
  rawGroups: CjkAstNodeUnmergedPart[],
): void => {
  let accumulator: CjkAstNodeUnparsedPart | undefined
  let last: CjkAstNodeUnmergedPart | undefined

  for (const next of rawGroups) {
    if (last !== undefined) {
      if (last.locale === next.locale) {
        last.content += next.content
      } else if (last.locale === undefined) {
        // last was Han
        // next must be JA or KO
        // have last inherit next's locale
        last.locale = next.locale
        last.content += next.content
      } else if (next.locale === undefined) {
        // next is Han
        // last must be JA or KO
        last.content += next.content
      } else {
        // there's a JA and KO mix, so commit the `last` and move `next` to `last`
        if (accumulator === undefined)
          accumulator = last as CjkAstNodeUnparsedPart // cast safe due to last.locale check
        else if (accumulator.locale === last.locale)
          accumulator.content += last.content
        else {
          mergedGroups.push(accumulator)
          accumulator = last as CjkAstNodeUnparsedPart
        }

        last = next
      }
    } else {
      last = next
    }
  }

  // if we iterated over nothing, we do nothing to the output
  if (last !== undefined) {
    if (last.locale !== undefined) {
      if (accumulator === undefined)
        mergedGroups.push(last as CjkAstNodeUnparsedPart) // cast safe due to last.locale check
      else if (accumulator.locale === last.locale) {
        accumulator.content += last.content
        mergedGroups.push(accumulator)
      } else {
        // differing locales, push both
        mergedGroups.push(accumulator)
        mergedGroups.push(last as CjkAstNodeUnparsedPart)
      }
    } else {
      // the only group we encountered was han
      // last should contain all content
      const userPreference: CjkLocale =
        moonlight.getConfigOption('hanfix', 'preferredLocale') || 'ja-JP'

      if (userPreference === 'ja-JP' && allInKanjidic(last.content)) {
        mergedGroups.push({
          locale: 'ja-JP',
          content: last.content,
        })
      } else if (allCantBeMoreSimplified(last.content)) {
        mergedGroups.push({
          locale: 'zh-CN',
          content: last.content,
        })
      } else if (allCantBeMoreTraditional(last.content)) {
        mergedGroups.push({
          locale: 'zh-TW',
          content: last.content,
        })
      } else {
        mergedGroups.push({
          locale: userPreference,
          content: last.content,
        })
      }
    }
  }
}

const cjkSegmentParse: ParseFunction = (
  capture: Capture,
  nestedParse: Parser,
  state: State,
): CjkAstNode => {
  const content = capture[0]

  const rawGroups: CjkAstNodeUnmergedPart[] = []

  while (pushNextCjkGroup(rawGroups, content));

  const mergedGroups: CjkAstNodeUnparsedPart[] = []

  mergeCjkGroups(mergedGroups, rawGroups)

  const dontRecurseState = {
    ...state,
    __moonlight_hanfix_incjk: true,
  }

  const parsedGroups: CjkAstNodePart[] = mergedGroups.map((p) => ({
    locale: p.locale,
    content: nestedParse(p.content, dontRecurseState),
  }))

  return {
    content,
    parts: parsedGroups,
  }
}

const cjkRenderer: SingleNodeOutput<React.ReactNode> = (
  { parts }: CjkAstNode | SingleASTNode,
  nestedOutput,
  state,
) => {
  const subpart = (p: CjkAstNodePart) => (
    <span lang={p.locale}>{p.content.map((v) => nestedOutput(v, state))}</span>
  )

  return parts.map((p: CjkAstNodePart) => subpart(p))
}

const cjkMarkdownRule = (rules: Record<string, MarkdownRule>): MarkdownRule => {
  const textRule = rules.text as MarkdownRule & {
    __moonlight_hanfix_patched?: boolean
  }
  if (!textRule.__moonlight_hanfix_patched) {
    const originalMatch = textRule.match

    // match the start of cjk anywhere in the text
    const unanchoredCjkRegex = new RegExp(
      // cut off the starting `^`
      cjkRegex.source.slice(1),
      cjkRegex.flags,
    )

    const newMatch: MatchFunction = (source, state, prevCapture) => {
      const innerText = originalMatch(source, state, prevCapture)

      // if we're in text, but NOT in CJK text
      if (innerText && !state.__moonlight_hanfix_incjk) {
        // find the start of CJK text
        const cjkIndex = innerText[0].search(unanchoredCjkRegex)

        if (cjkIndex > 0) {
          // if we found CJK, cut off the text rule before it
          innerText[0] = innerText[0].substring(0, cjkIndex)
        } else if (cjkIndex === 0) {
          // if the whole text is CJK, then we shouldn't use the text rule at all
          return null
        }
      }

      return innerText
    }

    textRule.__moonlight_hanfix_patched = true
    textRule.match = newMatch
  }

  const order = rules.text.order - 0.5
  const match = cjkSegmentMatch
  const parse = cjkSegmentParse
  return { order, match, parse, react: cjkRenderer }
}

const cjkSlateRule = (_rules: Record<string, SlateRule>): SlateRule => {
  // FIXME make this use text content to style
  return { type: 'verbatim' }
}

markdown.addRule('cjk', cjkMarkdownRule, cjkSlateRule)
