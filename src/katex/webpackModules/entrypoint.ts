import {
  MarkdownRule,
  MatchFunction,
  ParseFunction,
  SingleNodeOutput,
  SlateRule
} from "@moonlight-mod/types/src/coreExtensions/markdown";
import markdown from "@moonlight-mod/wp/markdown_markdown";
import React from "@moonlight-mod/wp/react";
import katex from "katex";

const KaTeXElement = (props: { katexCode: string, displayMode: boolean }) => {
  const container = React.useRef<HTMLElement>()

  React.useEffect(() => {
    katex.render(props.katexCode, container.current!, { displayMode: props.displayMode })
  }, [props.katexCode, props.displayMode])

  return React.createElement('span', {
    ref: container,
    className: 'katex-math',
  })
}

const inlineRegex = /\\\\\(((?:[^\\]+|\\[^\\]|\\\\[^)])*)\\\\\)/

const inlineMarkdownMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    return regex.exec(source)
  }
  f.regex = regex
  return f
})(inlineRegex)

const inlineMarkdownParse: ParseFunction = (capture, nestedParse, state) => {
  const katexCode = capture[1]
  return {
    type: "inlineKatex",
    katexCode: katexCode
  }
}

const inlineMarkdownRender: SingleNodeOutput<React.ReactNode> = ({ katexCode }, nestedOutput, state) => {
  return React.createElement(KaTeXElement, { katexCode, displayMode: false })
}

const inlineMarkdownRule = (rules: Record<string, MarkdownRule>): MarkdownRule => {
  const order = 19
  const match = inlineMarkdownMatch
  const parse = inlineMarkdownParse
  return { order, match, parse, react: inlineMarkdownRender }
}

const inlineSlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  return { type: "verbatim" }
}

markdown.addRule(
  "inlineKatex",
  inlineMarkdownRule,
  inlineSlateRule
)

const blockRegex = /\\\\\[((?:[^\\]+|\\[^\\]|\\\\[^\]])*)\\\\]/

const blockMarkdownMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    return regex.exec(source)
  }
  f.regex = regex
  return f
})(blockRegex)

const blockMarkdownParse: ParseFunction = (capture, nestedParse, state) => {
  const katexCode = capture[1]
  return {
    type: "blockKatex",
    katexCode: katexCode
  }
}

const blockMarkdownRender: SingleNodeOutput<React.ReactNode> = ({ katexCode }, nestedOutput, state) => {
  return React.createElement(KaTeXElement, { katexCode, displayMode: true })
}

const blockMarkdownRule = (rules: Record<string, MarkdownRule>): MarkdownRule => {
  const order = 19
  const match = blockMarkdownMatch
  const parse = blockMarkdownParse
  return { order, match, parse, react: blockMarkdownRender }
}

const blockSlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  return { type: "verbatim" }
}

markdown.addRule(
  "blockKatex",
  blockMarkdownRule,
  blockSlateRule
)
