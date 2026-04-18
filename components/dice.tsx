/**
 * Dice — a single animated die.
 *
 * Animation design
 * ─────────────────
 * When `isRolling` flips to `true` the die plays a three-phase sequence:
 *
 *  Phase 1 — Launch  (0 → ~120 ms + stagger)
 *    • Scale punches in to 0.85, giving a "pressed into table" feel.
 *    • Face dots fade to transparent so the spinning blur looks clean.
 *
 *  Phase 2 — Tumble  (~120 ms → ~820 ms + stagger)
 *    • rotateZ spins 2–4 full rotations with an easeOut curve (fast start,
 *      decelerates as if losing kinetic energy).
 *    • rotateX and rotateY add orthogonal tilts so the die appears to tumble
 *      in true 3-D space, not just spin flat.
 *    • Scale shoots up to 1.2 to simulate the die "leaving" the surface.
 *    • The elliptical drop shadow expands and darkens (die is "in the air").
 *
 *  Phase 3 — Land  (~820 ms → ~1 400 ms + stagger)
 *    • All rotations spring back to 0 with damped oscillation.
 *    • Scale springs back to 1 with a small overshoot bounce.
 *    • Shadow shrinks back to resting opacity.
 *    • Face dots fade back in revealing the final value.
 *
 * Stagger
 * ────────
 * Each die receives a `rollIndex` prop and delays its animation by
 * STAGGER_MS × rollIndex.  Multiple dice therefore land one after another,
 * creating a natural cascade instead of all landing simultaneously.
 *
 * Performance notes
 * ──────────────────
 * • All shared values are driven entirely on the UI thread via Reanimated.
 * • The component skips the animation on its very first render (`mounted` ref)
 *   so newly added dice don't animate spuriously on mount.
 * • `DiceFace` is wrapped in `memo` to prevent dot re-renders while spinning.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

import { DiceFace } from './dice-face';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Duration of the easeOut spin (ms). */
const SPIN_MS = 720;

/** Per-die stagger delay (ms). */
const STAGGER_MS = 90;

/** Spring config used for the landing phase. */
const LAND_SPRING = { damping: 11, stiffness: 155, mass: 0.9 };

/** Spring config for the scale bounce on landing. */
const SCALE_SPRING = { damping: 8, stiffness: 200, mass: 0.7 };

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiceProps {
  /** The face value to display (1–6). */
  value: number;
  /** The rendered square size in logical pixels. */
  size: number;
  /** When true the die plays its roll animation. */
  isRolling: boolean;
  /** Index within the multi-die group — used to stagger animations. */
  rollIndex: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Dice({ value, size, isRolling, rollIndex }: DiceProps) {
  // ── Shared values (all UI-thread, never cause JS re-renders) ──────────────
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const rotZ = useSharedValue(0);
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.28);
  const shadowScaleX = useSharedValue(1);
  const faceOpacity = useSharedValue(1);

  // Skip animation on the very first render (component mount).
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // Only animate when rolling starts; ignore the reset to false.
    if (!isRolling) return;

    // ── Randomise rotation directions & counts ────────────────────────────
    const signX = Math.random() > 0.5 ? 1 : -1;
    const signY = Math.random() > 0.5 ? 1 : -1;
    const signZ = Math.random() > 0.5 ? 1 : -1;

    // Full rotations (integer) so the die always lands upright (0°).
    const spinsX = (2 + Math.floor(Math.random() * 3)) * 180 * signX; // 360°–720°
    const spinsY = (2 + Math.floor(Math.random() * 3)) * 180 * signY;
    const spinsZ = (2 + Math.floor(Math.random() * 4)) * 360 * signZ; // 720°–1440°

    const delay = rollIndex * STAGGER_MS;

    // ── Face opacity: fade out → (hold) → fade in ─────────────────────────
    faceOpacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) }),
        // Hold invisible for most of the spin, then fade back.
        withDelay(
          SPIN_MS - 80,
          withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
        ),
      ),
    );

    // ── Scale: punch-in → soar → spring land ─────────────────────────────
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(0.82, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1.18, { duration: SPIN_MS * 0.65, easing: Easing.out(Easing.cubic) }),
        withSpring(1, SCALE_SPRING),
      ),
    );

    // ── Shadow: deepen in air → settle ───────────────────────────────────
    shadowOpacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.55, { duration: SPIN_MS }),
        withSpring(0.28, LAND_SPRING),
      ),
    );
    shadowScaleX.value = withDelay(
      delay,
      withSequence(
        withTiming(1.35, { duration: SPIN_MS }),
        withSpring(1, LAND_SPRING),
      ),
    );

    // ── Primary Z rotation (most visible "spin") ──────────────────────────
    rotZ.value = withDelay(
      delay,
      withSequence(
        withTiming(spinsZ, { duration: SPIN_MS, easing: Easing.out(Easing.cubic) }),
        withSpring(0, LAND_SPRING),
      ),
    );

    // ── X-axis tilt (tumble depth) ────────────────────────────────────────
    rotX.value = withDelay(
      delay,
      withSequence(
        withTiming(spinsX, { duration: SPIN_MS * 0.85, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, LAND_SPRING),
      ),
    );

    // ── Y-axis tilt (tumble width) ────────────────────────────────────────
    rotY.value = withDelay(
      delay,
      withSequence(
        withTiming(spinsY, { duration: SPIN_MS * 0.9, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, LAND_SPRING),
      ),
    );
  }, [isRolling]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles (all computed on UI thread) ───────────────────────────

  const dieStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
      { rotateZ: `${rotZ.value}deg` },
      { scale: scale.value },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
    transform: [
      // Shadow stretches horizontally as die rises.
      {
        scaleX: interpolate(
          shadowScaleX.value,
          [1, 1.35],
          [1, 1.35],
        ),
      },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: faceOpacity.value,
  }));

  // ── Derived sizes ─────────────────────────────────────────────────────────
  const cornerRadius = size * 0.17;

  return (
    <View style={styles.wrapper}>
      {/* Elliptical ground shadow — animates independently of the die body */}
      <Animated.View
        style={[
          styles.shadow,
          { width: size * 0.78, height: size * 0.16 },
          shadowStyle,
        ]}
      />

      {/* Die body */}
      <Animated.View
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderRadius: cornerRadius,
          },
          dieStyle,
        ]}
      >
        {/* Pip layer fades during roll */}
        <Animated.View style={faceStyle}>
          <DiceFace value={value} size={size} />
        </Animated.View>

        {/* Top-left gloss highlight for depth */}
        <View
          style={[
            styles.gloss,
            {
              width: size * 0.38,
              height: size * 0.22,
              borderRadius: cornerRadius,
              top: size * 0.06,
              left: size * 0.06,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    margin: 10,
  },

  die: {
    backgroundColor: '#F8F6F0',  // warm off-white — classic casino ivory
    justifyContent: 'center',
    alignItems: 'center',

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,

    // Android elevation
    elevation: 10,
  },

  /** Soft ellipse beneath the die that grows/shrinks as the die "floats". */
  shadow: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#000',
    borderRadius: 50,
    // Soft blur via shadow on iOS; on Android the View itself is the shadow.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 2,
  },

  /** Semi-transparent white oval in the top-left corner for a glossy look. */
  gloss: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
});
