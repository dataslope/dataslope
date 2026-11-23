import type { ImgHTMLAttributes } from "react";
import imageManifest from "@/lib/generated/images";

/**
 * A promoted cut-out, animated where an animated version exists.
 *
 * `scripts/animate-illustrations.mjs` writes `<id>-animated.webp` beside
 * `<id>-cutout.webp`, laid out on the static file's own footprint (same
 * aspect, same subject width, same baseline), so the static manifest entry's
 * width/height reserve the right box for either. The animation is offered
 * through a `<source>` gated on `prefers-reduced-motion: no-preference`, which
 * makes the static cut-out the fallback for readers who ask for less motion,
 * with no JavaScript involved. `display: contents` keeps the `<picture>`
 * wrapper out of layout, so `className` styles the `<img>` exactly as it did
 * before.
 *
 * A slug missing from the manifest renders nothing rather than a broken image.
 */
export function cutoutImage(cutoutSlug: string) {
  const entry = imageManifest[cutoutSlug];
  if (!entry) return null;
  const animatedSlug = cutoutSlug.replace(/-cutout$/, "-animated");
  const animated = animatedSlug !== cutoutSlug ? imageManifest[animatedSlug] : undefined;
  return {
    src: `/images/${cutoutSlug}.${entry.formats[entry.formats.length - 1]}`,
    animatedSrc: animated ? `/images/${animatedSlug}.webp` : null,
    width: entry.width,
    height: entry.height,
  };
}

type CutoutImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  slug: string;
};

export function CutoutImage({ slug, alt = "", ...imgProps }: CutoutImageProps) {
  const image = cutoutImage(slug);
  if (!image) return null;
  return (
    <picture className="contents">
      {image.animatedSrc ? (
        <source
          srcSet={image.animatedSrc}
          type="image/webp"
          media="(prefers-reduced-motion: no-preference)"
        />
      ) : null}
      <img src={image.src} width={image.width} height={image.height} alt={alt} {...imgProps} />
    </picture>
  );
}
