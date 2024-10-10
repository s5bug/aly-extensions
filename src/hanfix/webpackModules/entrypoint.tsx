import {
  MarkdownRule,
  MatchFunction,
  ParseFunction,
  SingleASTNode,
  SingleNodeOutput,
  SlateRule
} from "@moonlight-mod/types/src/coreExtensions/markdown";
import * as markdown from "@moonlight-mod/wp/markdown_markdown";
import React from "@moonlight-mod/wp/react";

const natives: {
  traditionalToSimplified: Readonly<Record<number, number>>,
  simplifiedToTraditional: Readonly<Record<number, number>>,
  kanjidic: Readonly<Record<number, undefined>>
} = moonlight.getNatives('hanfix');

type CjkLocale = "ja-JP" | "zh-CN" | "zh-TW" | "ko-KR";

type CjkAstNodeUnmergedPart = {
  locale: "ja-JP" | "ko-KR" | undefined;
  content: string;
}

type CjkAstNodeUnparsedPart = {
  locale: CjkLocale;
  content: string;
}

type CjkAstNodePart = {
  locale: CjkLocale;
  content: SingleASTNode[];
}

type CjkAstNode = {
  content: string;
  parts: CjkAstNodePart[];
}

const cjkRegex = /^(?:\p{sc=Han}|\p{sc=Katakana}|\p{sc=Hiragana}|\p{sc=Hangul}|[、，。])+/u

const cjkSegmentMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    if(state.__moonlight_hanfix_incjk) return null;
    return regex.exec(source)
  }
  f.regex = regex
  return f
})(cjkRegex)

const allInKanjidic = (search: string): boolean => {
  for(const codepoint of search) {
    const cpNum = codepoint.codePointAt(0)!
    if(!(cpNum in natives.kanjidic)) return false;
  }
  return true;
}

const allCantBeMoreTraditional = (search: string): boolean => {
  for(const codepoint of search) {
    const cpNum = codepoint.codePointAt(0)!
    if(cpNum in natives.simplifiedToTraditional) return false;
  }
  return true;
}

const allCantBeMoreSimplified = (search: string): boolean => {
  for(const codepoint of search) {
    const cpNum = codepoint.codePointAt(0)!
    if(cpNum in natives.traditionalToSimplified) return false;
  }
  return true;
}

const alternativeRegex =
  /(?<zh>(\p{sc=Han}|[，。])+)|(?<ja>(?:\p{sc=Katakana}|\p{sc=Hiragana}|、)+)|(?<ko>\p{sc=Hangul}+)/yu

const pushNextCjkGroup = (rawGroups: CjkAstNodeUnmergedPart[], content: string): boolean => {
  const nextLanguageGroup = alternativeRegex.exec(content)
  if(nextLanguageGroup === null) {
    alternativeRegex.lastIndex = 0
    return false;
  } else {
    if(nextLanguageGroup.groups!['ja'] !== undefined) {
      rawGroups.push({
        locale: 'ja-JP',
        content: nextLanguageGroup.groups!['ja']
      })
    } else if(nextLanguageGroup.groups!['ko'] !== undefined) {
      rawGroups.push({
        locale: 'ko-KR',
        content: nextLanguageGroup.groups!['ko']
      })
    } else if(nextLanguageGroup.groups!['zh'] !== undefined) {
      rawGroups.push({
        locale: undefined,
        content: nextLanguageGroup.groups!['zh']
      })
    } else {
      throw new Error("Failed to parse raw language groups: " + content)
    }
    return true;
  }
}

const mergeCjkGroups = (mergedGroups: CjkAstNodeUnparsedPart[], rawGroups: CjkAstNodeUnmergedPart[]): void => {
  let accumulator: CjkAstNodeUnparsedPart | undefined = undefined
  let last: CjkAstNodeUnmergedPart | undefined = undefined

  for(const next of rawGroups) {
    if(last !== undefined) {
      if(last.locale === next.locale) {
        last.content += next.content
      } else if(last.locale === undefined) {
        // last was Han
        // next must be JA or KO
        // have last inherit next's locale
        last.locale = next.locale
        last.content += next.content
      } else if(next.locale === undefined) {
        // next is Han
        // last must be JA or KO
        last.content += next.content
      } else {
        // there's a JA and KO mix, so commit the `last` and move `next` to `last`
        if(accumulator === undefined) accumulator = (last as CjkAstNodeUnparsedPart) // cast safe due to last.locale check
        else if(accumulator.locale === last.locale) accumulator.content += last.content
        else {
          mergedGroups.push(accumulator)
          accumulator = (last as CjkAstNodeUnparsedPart)
        }

        last = next
      }
    } else {
      last = next
    }
  }

  // if we iterated over nothing, we do nothing to the output
  if(last !== undefined) {
    if(last.locale !== undefined) {
      if(accumulator === undefined) mergedGroups.push(last as CjkAstNodeUnparsedPart) // cast safe due to last.locale check
      else if(accumulator.locale === last.locale) {
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
        moonlight.getConfigOption('hanfix', 'preferredLocale') || 'ja-JP';

      if(userPreference === 'ja-JP' && allInKanjidic(last.content)) {
        mergedGroups.push({
          locale: 'ja-JP',
          content: last.content
        })
      } else if(allCantBeMoreSimplified(last.content)) {
        mergedGroups.push({
          locale: 'zh-CN',
          content: last.content
        })
      } else if(allCantBeMoreTraditional(last.content)) {
        mergedGroups.push({
          locale: 'zh-TW',
          content: last.content
        })
      } else {
        mergedGroups.push({
          locale: userPreference,
          content: last.content
        })
      }
    }
  }
}

const cjkSegmentParse: ParseFunction = (capture, nestedParse, state): CjkAstNode => {
  const content = capture[0]

  let rawGroups: CjkAstNodeUnmergedPart[] = []

  while(pushNextCjkGroup(rawGroups, content));

  let mergedGroups: CjkAstNodeUnparsedPart[] = []

  mergeCjkGroups(mergedGroups, rawGroups);

  let dontRecurseState = {
    ...state,
    __moonlight_hanfix_incjk: true
  }

  let parsedGroups: CjkAstNodePart[] =
    mergedGroups.map(p => ({
      locale: p.locale, content: nestedParse(p.content, dontRecurseState)
    }))

  return {
    content,
    parts: parsedGroups
  }
}

const cjkRenderer: SingleNodeOutput<React.ReactNode> = ({ parts }: CjkAstNode | SingleASTNode, nestedOutput, state) => {
  const subpart = (p: CjkAstNodePart) =>
    <span lang={p.locale}>{p.content.map(v => nestedOutput(v, state))}</span>

  return parts.map((p: CjkAstNodePart) => subpart(p))
}

const cjkMarkdownRule = (rules: Record<string, MarkdownRule>): MarkdownRule => {
  const order = rules.text.order - 0.5
  const match = cjkSegmentMatch
  const parse = cjkSegmentParse
  return { order, match, parse, react: cjkRenderer }
}

const cjkSlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  // FIXME make this use text content to style
  return { type: "verbatim" }
}

markdown.addRule(
  "cjk",
  cjkMarkdownRule,
  cjkSlateRule
)
