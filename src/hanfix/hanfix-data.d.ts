declare module 'hanfix:data' {
  export const traditionalToSimplified: Readonly<Record<number, number>>
  export const simplifiedToTraditional: Readonly<Record<number, number>>
  export const kanjidic: Readonly<Record<number, true>>
}
