import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, with the last one winning.
 *
 * Every component below takes a `className` so a caller can adjust it, and a
 * caller that passes `px-8` to a component that already carries `px-4` expects
 * the padding to change rather than to be joined and lose the specificity fight.
 * `clsx` decides what is actually there and `twMerge` decides which of two
 * utilities for the same property survives, which is the part a plain join
 * cannot do.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
