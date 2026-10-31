import { expect, it } from "vitest";
import { defaultLook, readLook } from "@/lib/desktop/appearance";
it("migrates earlier UI preferences without losing the chosen image or theme", () => {
  const image = "data:image/png;base64,AAAA";
  const look = readLook(JSON.stringify({ mode: "light", wallpaper: "image", image, glass: false }));
  expect(look).toMatchObject({ mode: "light", wallpaper: "image", image, glass: false, locale: "vi", motion: true, material: "auto" });
});
it("rejects foreign images and prototype accent keys and clamps device preferences", () => {
  const look = readLook(JSON.stringify({ ...defaultLook, image: "https://example.com/private", wallpaper: "image", accent: "toString", dim: 900, mediaRevision: -3, locale: "xx", material: "bogus" }));
  expect(look).toMatchObject({ image: undefined, wallpaper: "geeo", accent: "geeo", dim: 80, mediaRevision: 0, locale: "vi", material: "auto" });
  expect(readLook("{" )).toEqual(defaultLook);
});
