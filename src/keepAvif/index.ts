import type { Patch } from '@moonlight-mod/types'

export const patches: Patch[] = [
  {
    find: '.toLowerCase().endsWith(".avif")',
    replace: [
      {
        // patch the favorite GIF rendering component
        match: /\i\.pathname\.toLowerCase\(\)\.endsWith\("\.avif"\)/,
        replacement: 'false',
      },
      {
        // patch the call to the mediaproxy
        match: /(\i)=\i\.toLowerCase\(\)\.endsWith\("\.avif"\)/,
        replacement: (_, vname) => `${vname}=false`,
      },
    ],
  },
  {
    find: 'ImageLoaderUtils.getSrcWithWidthAndHeight',
    replace: [
      {
        // patch rendering in embeds and uploads
        match:
          /,(\i)\.test\((\i)\)&&\(\i\.format="webp"\);let (\i)=\(([^)]*)\)\({width:(\i),height:(\i),/,
        replacement: (
          _,
          avifRegex,
          target,
          params,
          fnArgs,
          widthVar,
          heightVar,
        ) =>
          `;let ${params}=${avifRegex}.test(${target})?{}:{width:${widthVar},height:${heightVar}};${params}=(${fnArgs})({...${params},`,
      },
    ],
  },
  {
    find: 'updateAsync("favoriteGifs"',
    replace: [
      {
        // patch saving favorite gifs
        match:
          /(\i)=(\i)\.endsWith\("\.avif"\),(\i)=\2\.endsWith\("\.gif"\);return (\i)\|\|\1\|\|\3\?\(\(\1\|\|\3\)&&(\i)\.searchParams\.set\("format","webp"\),/,
        replacement: (_, isAvif, path, isGif, isWebp, target) =>
          `${isAvif}=${path}.endsWith(".avif"),${isGif}=${path}.endsWith(".gif");return ${isWebp}||${isAvif}||${isGif}?(${isGif}&&${target}.searchParams.set("format","webp"),`,
      },
    ],
  },
]
