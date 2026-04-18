/**
 * DiceFace — renders the pip (dot) pattern for a single die value (1–6).
 *
 * Layout model
 * ─────────────
 * We use seven named positions arranged like a physical die face:
 *
 *   TL ·── TR        TL = top-left     TR = top-right
 *   ML ·── MR        ML = mid-left     MR = mid-right
 *   BL ·── BR        BL = bottom-left  BR = bottom-right
 *      CC             CC = center
 *
 * Each face value activates a specific subset of these positions:
 *
 *   1 →  CC
 *   2 →  TR · BL
 *   3 →  TR · CC · BL
 *   4 →  TL · TR · BL · BR
 *   5 →  TL · TR · CC · BL · BR
 *   6 →  TL · TR · ML · MR · BL · BR
 *
 * All positions are resolved at render time using `size` so the component
 * scales perfectly to any die size.
 */

import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type DotPosition = 'TL' | 'TR' | 'ML' | 'MR' | 'CC' | 'BL' | 'BR';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Map each face value to the dot positions that should be visible. */
const DOT_PATTERNS: Record<number, DotPosition[]> = {
  1: ['CC'],
  2: ['TR', 'BL'],
  3: ['TR', 'CC', 'BL'],
  4: ['TL', 'TR', 'BL', 'BR'],
  5: ['TL', 'TR', 'CC', 'BL', 'BR'],
  6: ['TL', 'TR', 'ML', 'MR', 'BL', 'BR'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the absolute-position style for a given dot position.
 * All measurements are derived from `size` so the face scales freely.
 */
function getDotStyle(
  position: DotPosition,
  dotRadius: number,
  edge: number,
  size: number,
  dotColor: string,
): ViewStyle {
  const base: ViewStyle = {
    position: 'absolute',
    width: dotRadius * 2,
    height: dotRadius * 2,
    borderRadius: dotRadius,
    backgroundColor: dotColor,
  };

  // Vertical center: half the face minus the dot radius.
  const vCenter = size / 2 - dotRadius;

  switch (position) {
    case 'TL': return { ...base, top: edge, left: edge };
    case 'TR': return { ...base, top: edge, right: edge };
    case 'ML': return { ...base, top: vCenter, left: edge };
    case 'MR': return { ...base, top: vCenter, right: edge };
    case 'CC': return { ...base, top: vCenter, left: size / 2 - dotRadius };
    case 'BL': return { ...base, bottom: edge, left: edge };
    case 'BR': return { ...base, bottom: edge, right: edge };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DiceFaceProps {
  /** Die value to display (1–6). Values out of range fall back to 1. */
  value: number;
  /** Overall size of the face in logical pixels. */
  size: number;
  /** Pip colour. Defaults to classic casino red. */
  dotColor?: string;
}

export const DiceFace = memo(function DiceFace({
  value,
  size,
  dotColor = '#D72638',
}: DiceFaceProps) {
  // Clamp value to valid range.
  const safeValue = Math.min(6, Math.max(1, Math.round(value)));
  const positions = DOT_PATTERNS[safeValue];

  // Scale dot size and edge padding proportionally to the die face.
  const dotRadius = size * 0.09;  // dot diameter ≈ 18 % of face size
  const edge = size * 0.165;      // inset from face edge ≈ 16.5 %

  return (
    <View style={{ width: size, height: size }}>
      {positions.map((pos) => (
        <View
          key={pos}
          style={getDotStyle(pos, dotRadius, edge, size, dotColor)}
        />
      ))}
    </View>
  );
});
