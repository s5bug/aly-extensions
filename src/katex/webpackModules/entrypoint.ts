import {
  MarkdownRule,
  MatchFunction,
  ParseFunction,
  SingleNodeOutput,
  SlateRule
} from "@moonlight-mod/types/coreExtensions/markdown";
import * as markdown from "@moonlight-mod/wp/markdown_markdown";
import React from "@moonlight-mod/wp/react";
import katex from "katex";

const KaTeXElement = (props: { katexCode: string; displayMode: boolean }) => {
  const container = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    katex.render(props.katexCode, container.current!, {
      displayMode: props.displayMode,
      throwOnError: false
    });
  }, [props.katexCode, props.displayMode]);

  return React.createElement(props.displayMode ? "div" : "span", {
    ref: container,
    className: "katex-math"
  });
};

const inlineRegex = /^\\\\\(((?:[^\\]|\\[^\\]|\\\\[^)])*)\\\\\)/;

const inlineMarkdownMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    return regex.exec(source);
  };
  f.regex = regex;
  return f;
})(inlineRegex);

const inlineMarkdownParse: ParseFunction = (capture, nestedParse, state) => {
  return {
    content: capture[0],
    katexCode: capture[1]
  };
};

const inlineMarkdownRender: SingleNodeOutput<React.ReactNode> = (
  { katexCode },
  nestedOutput,
  state
) => {
  return React.createElement(KaTeXElement, { katexCode, displayMode: false });
};

const inlineMarkdownRule = (
  rules: Record<string, MarkdownRule>
): MarkdownRule => {
  const order = rules.escape.order - 0.5;
  const match = inlineMarkdownMatch;
  const parse = inlineMarkdownParse;
  return { order, match, parse, react: inlineMarkdownRender };
};

const inlineSlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  return { type: "verbatim" };
};

markdown.addRule("inlineKatex", inlineMarkdownRule, inlineSlateRule);

const blockRegex = /^\\\\\[((?:[^\\]|\\[^\\]|\\\\[^\]])*)\\\\]/;

const blockMarkdownMatch: MatchFunction = ((regex) => {
  const f: MatchFunction = (source, state, prevCapture) => {
    return regex.exec(source);
  };
  f.regex = regex;
  return f;
})(blockRegex);

const blockMarkdownParse: ParseFunction = (capture, nestedParse, state) => {
  return {
    content: capture[0],
    katexCode: capture[1]
  };
};

const blockMarkdownRender: SingleNodeOutput<React.ReactNode> = (
  { katexCode },
  nestedOutput,
  state
) => {
  return React.createElement(KaTeXElement, { katexCode, displayMode: true });
};

const blockMarkdownRule = (
  rules: Record<string, MarkdownRule>
): MarkdownRule => {
  const order = rules.escape.order - 0.5;
  const match = blockMarkdownMatch;
  const parse = blockMarkdownParse;
  return { order, match, parse, react: blockMarkdownRender };
};

const blockSlateRule = (rules: Record<string, SlateRule>): SlateRule => {
  return { type: "verbatim" };
};

markdown.addRule("blockKatex", blockMarkdownRule, blockSlateRule);
