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

type RubyGroup = {
  base: SingleASTNode[];
  ruby: SingleASTNode[];
}

type RubyASTNode = {
  content: string;
  rubyGroups: RubyGroup[];
  leftovers: SingleASTNode[];
}

// we wrap in {{ ... }}, and our internal text should look like
// base(ruby)base(ruby)leftover
// parentheses are forbidden in base or ruby text (even if paren counting was
// involved, should the inner or outer parens be the ruby?)
const externalRegex = /^\{\{((?:(?:[^}()]+|}[^}()])+\((?:[^}()]+|}[^}()])+\))*)((?:[^}()]+|}[^}()])*)}}/

const rubySegmentMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    return regex.exec(source)
  }
  f.regex = regex
  return f
})(externalRegex)

const internalRegex = /((?:[^}()]+|}[^}()])+)\(((?:[^}()]+|}[^}()])+)\)/g

const rubySegmentParse: ParseFunction = (capture, nestedParse, state): RubyASTNode => {
  const content = capture[0]
  const baseRubyGroups = capture[1]
  const leftovers = nestedParse(capture[2], state)

  let rubyGroups: RubyGroup[] = []
  let match: RegExpMatchArray | null;
  while ((match = internalRegex.exec(baseRubyGroups)) != null) {
    const base = nestedParse(match[1], state)
    const ruby = nestedParse(match[2], state)
    rubyGroups.push({ base, ruby })
  }
  internalRegex.lastIndex = 0

  return { content, rubyGroups, leftovers }
}

const rubyGroupRenderer = (base: React.ReactNode[], ruby: React.ReactNode[]): React.ReactNode[] => {
  return [...base, <rp>(</rp>, <rt>{ruby}</rt>, <rp>)</rp>]
}

const rubyRenderer: SingleNodeOutput<React.ReactNode> = ({ rubyGroups, leftovers }: RubyASTNode | SingleASTNode, nestedOutput, state) => {
  const groupElems: React.ReactNode[] = rubyGroups.flatMap(({ base, ruby }: RubyGroup) => {
    return rubyGroupRenderer(base.map(v => nestedOutput(v, state)), ruby.map(v => nestedOutput(v, state)))
  })
  const leftoverElems: React.ReactNode[] = leftovers.map((v: SingleASTNode) => nestedOutput(v, state))

  return <ruby>{groupElems}{leftoverElems}</ruby>
}

const rubyRule = (rules: Record<string, MarkdownRule>): MarkdownRule => {
  const order = rules.spoiler.order
  const match = rubySegmentMatch
  const parse = rubySegmentParse
  return { order, match, parse, react: rubyRenderer }
}

const rubySlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  return { type: "verbatim" }
}

markdown.addRule(
  "ruby",
  rubyRule,
  rubySlateRule
)
