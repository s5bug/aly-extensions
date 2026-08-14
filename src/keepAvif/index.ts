import type { Patch } from '@moonlight-mod/types'

export const patches: Patch[] = [
  {
    find: 'ImageLoaderUtils.getSrcWithWidthAndHeight',
    replace: [
      {
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
]
