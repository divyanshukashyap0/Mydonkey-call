// Framer Motion Animation Variants for MyDonkey-Call
import { Variants } from 'framer-motion';
import { duration, ease, spring } from './tokens';

export const pageEntrance: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.emphasis, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast, ease: ease.in },
  },
};

export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.normal, ease: ease.out },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: ease.in },
  },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.emphasis, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: { duration: duration.fast, ease: ease.in },
  },
};

export const bottomSheet: Variants = {
  initial: { y: '100%' },
  animate: {
    y: 0,
    transition: spring.medium,
  },
  exit: {
    y: '100%',
    transition: { duration: duration.normal, ease: ease.in },
  },
};

export const floatingCallOverlay: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: spring.soft,
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 8,
    transition: { duration: duration.fast, ease: ease.in },
  },
};

export const staggerContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
};

export const toastVariant: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.soft,
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.95,
    transition: { duration: duration.fast, ease: ease.in },
  },
};

export const dropdownVariant: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.fast, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: duration.instant, ease: ease.in },
  },
};

export const drawerVariant: Variants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: { duration: duration.emphasis, ease: ease.out },
  },
  exit: {
    x: '100%',
    transition: { duration: duration.fast, ease: ease.in },
  },
};
