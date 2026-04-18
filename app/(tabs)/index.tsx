/**
 * Dice Roller — main screen.
 *
 * State model
 * ────────────
 * • diceCount  — how many dice are shown (1–MAX_DICE).
 * • diceValues — current face values for each die (array of 1–6).
 * • isRolling  — true while the roll animation is playing.
 *
 * Roll sequence
 * ──────────────
 * 1. rollDice() generates fresh random values and stores them immediately.
 * 2. isRolling is set to true → every <Dice> starts its tumble animation.
 * 3. A setTimeout fires after ROLL_TOTAL_MS (covers max stagger + animation
 *    + spring settle) and resets isRolling to false.
 * 4. Each <Dice> fades its dots back in revealing the pre-set final values.
 *
 * Setting new values *before* starting the animation means we never need a
 * JS-thread callback from inside a worklet, keeping the code simple and the
 * animation jank-free.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Dice } from '@/components/dice';
import { useShake } from '@/hooks/use-shake';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DICE = 1;
const MAX_DICE = 6;

/**
 * Total time (ms) to wait before marking the roll as complete.
 * Must be ≥ (MAX_DICE - 1) × STAGGER_MS + SPIN_MS + spring settle.
 * Using 2 000 ms provides comfortable headroom.
 */
const ROLL_TOTAL_MS = 2000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a random integer in [1, 6]. */
const rollOne = () => Math.floor(Math.random() * 6) + 1;

/** Derive a responsive die size from the current dice count. */
function getDiceSize(count: number): number {
  const { width } = Dimensions.get('window');
  if (count === 1) return Math.min(width * 0.56, 210);
  if (count === 2) return Math.min(width * 0.39, 155);
  if (count <= 4) return Math.min(width * 0.33, 135);
  return Math.min(width * 0.29, 115);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiceScreen() {
  const [diceCount, setDiceCount] = useState(2);
  const [diceValues, setDiceValues] = useState<number[]>([3, 5]);
  const [isRolling, setIsRolling] = useState(false);

  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the roll timer if the screen unmounts mid-roll.
  useEffect(() => () => { if (rollTimerRef.current) clearTimeout(rollTimerRef.current); }, []);

  // ── Core roll logic ─────────────────────────────────────────────────────
  const rollDice = useCallback(() => {
    if (isRolling) return; // Ignore if already rolling.

    // 1. Generate new face values up-front so dice components can fade them in.
    setDiceValues(Array.from({ length: diceCount }, rollOne));

    // 2. Start animation.
    setIsRolling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 3. Reset after the animation chain finishes.
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    rollTimerRef.current = setTimeout(() => {
      setIsRolling(false);
      rollTimerRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, ROLL_TOTAL_MS);
  }, [isRolling, diceCount]);

  // Shake triggers a roll — identical to pressing the button.
  useShake(rollDice);

  // ── Dice count controls ──────────────────────────────────────────────────
  const addDie = useCallback(() => {
    if (diceCount >= MAX_DICE || isRolling) return;
    setDiceCount((c) => c + 1);
    setDiceValues((v) => [...v, rollOne()]);
  }, [diceCount, isRolling]);

  const removeDie = useCallback(() => {
    if (diceCount <= MIN_DICE || isRolling) return;
    setDiceCount((c) => c - 1);
    setDiceValues((v) => v.slice(0, -1));
  }, [diceCount, isRolling]);

  // ── Derived values ───────────────────────────────────────────────────────
  const diceSize = getDiceSize(diceCount);
  const total = diceValues.reduce((sum, v) => sum + v, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F23" />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Dice Roller</Text>
        <Text style={styles.subtitle}>
          {isRolling ? 'Rolling…' : 'Shake or tap to roll'}
        </Text>
      </View>

      {/* ── Dice tray ────────────────────────────────────────────────────── */}
      <View style={styles.tray}>
        <View style={styles.diceGrid}>
          {diceValues.map((value, index) => (
            <Dice
              key={index}
              value={value}
              size={diceSize}
              isRolling={isRolling}
              rollIndex={index}
            />
          ))}
        </View>
      </View>

      {/* ── Total (only shown when 2+ dice) ──────────────────────────────── */}
      {diceCount > 1 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      )}

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <View style={styles.controls}>

        {/* Count stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, diceCount <= MIN_DICE && styles.stepBtnDisabled]}
            onPress={removeDie}
            disabled={diceCount <= MIN_DICE || isRolling}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>

          <Text style={styles.countLabel}>
            {diceCount} {diceCount === 1 ? 'Die' : 'Dice'}
          </Text>

          <TouchableOpacity
            style={[styles.stepBtn, diceCount >= MAX_DICE && styles.stepBtnDisabled]}
            onPress={addDie}
            disabled={diceCount >= MAX_DICE || isRolling}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Roll button */}
        <TouchableOpacity
          style={[styles.rollBtn, isRolling && styles.rollBtnRolling]}
          onPress={rollDice}
          disabled={isRolling}
          activeOpacity={0.82}
        >
          <Text style={styles.rollBtnText}>
            {isRolling ? 'Rolling…' : '🎲  Roll Dice'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',  // deep navy — casino table feel
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#7070A0',
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Dice tray
  tray: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '92%',
  },

  // Total
  totalRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 12,
    color: '#5A5A88',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
  },

  // Bottom controls
  controls: {
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    gap: 14,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E1E42',
    borderWidth: 1.5,
    borderColor: '#3A3A72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.28,
  },
  stepBtnText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 30,
  },
  countLabel: {
    width: 82,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  rollBtn: {
    backgroundColor: '#E63946',
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  rollBtnRolling: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  rollBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
