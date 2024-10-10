# aly-extensions

my extensions for [moonlight](https://moonlight-mod.github.io/)

## hanfix

runs a heuristic on CJK characters to properly associate language information,
fixing issues where i.e. Simplified Chinese is incorrectly rendered due to
client language being set `ja-JP`.

## katex

adds KaTeX-based math rendering via `\\(` and `\\)`, rendered to normal users as \\( and \\)

q.v. [Are \\( and \\) preferable to dollar signs for math mode?](https://tex.stackexchange.com/questions/510/are-and-preferable-to-dollar-signs-for-math-mode)

## ruby

adds Ruby (Furigana) support via `{{rb(rt)}}`

`{{猫(ねこ)}}を{{拾(ひろ)う}}` → <ruby>猫<rp>(</rp><rt>ねこ</rt><rp>)</rp></ruby>を<ruby>拾<rp>(</rp><rt>ひろ</rt><rp>)</rp>う</ruby>  
`{{我(wǒ)讲(jiǎng)日(rì)语(yǔ)}}` → <ruby>我<rp>(</rp><rt>wǒ</rt><rp>)</rp>讲<rp>(</rp><rt>jiǎng</rt><rp>)</rp>日<rp>(</rp><rt>rì</rt><rp>)</rp>语<rp>(</rp><rt>yǔ</rt><rp>)</rp></ruby>
