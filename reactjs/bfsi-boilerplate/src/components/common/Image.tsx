/**
 * BFSI <Image> wrapper. Prevents the two most common image perf bugs:
 *
 *   1. Cumulative layout shift (CLS) — caused by `<img>` without intrinsic
 *      dimensions. `width` and `height` are REQUIRED here so the browser can
 *      reserve the slot before the bytes arrive.
 *   2. Eager loading of below-the-fold images — caused by missing
 *      `loading="lazy"`. We default to lazy + async decoding; pass
 *      `priority` for above-the-fold images (hero, logo) so they preload.
 *
 * Usage:
 *
 *   <Image src="/branch-map.png" alt="Branch locations" width={640} height={320} />
 *   <Image src="/logo.svg" alt="Acme Bank" width={120} height={32} priority />
 */
import { forwardRef, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'decoding'> {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Above-the-fold images (hero, logo). Disables lazy loading so the browser fetches eagerly. */
  priority?: boolean;
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, width, height, priority = false, className, ...rest },
  ref,
) {
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn('max-w-full h-auto', className)}
      {...rest}
    />
  );
});
