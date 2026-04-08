export function colorLerp(start, end, amount) {
  return `color-mix(in srgb, ${start} ${Math.round((1 - amount) * 100)}%, ${end})`;
}

