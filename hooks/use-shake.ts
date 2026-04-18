/**
 * useShake — Device shake detection via the Accelerometer.
 *
 * How it works
 * ─────────────
 * The accelerometer reports raw G-force including the constant pull of gravity
 * (≈ 1 G when the phone is lying still).  We compute the total magnitude:
 *
 *   magnitude = √(x² + y² + z²)
 *
 * When the device is at rest, magnitude ≈ 1 G.  A vigorous shake causes sudden
 * acceleration spikes that push the magnitude well above 1 G.  Once the
 * magnitude crosses SHAKE_THRESHOLD we call the consumer callback and enter a
 * cooldown period to avoid firing multiple times from a single shake motion.
 *
 * UPDATE_INTERVAL_MS controls how often the sensor reports; 80 ms (~12 Hz) is
 * a good balance between responsiveness and battery life.
 */

import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

/** G-force above which we consider the phone to be shaking. */
const SHAKE_THRESHOLD = 1.8;

/** Minimum gap (ms) between two successive shake events. */
const SHAKE_COOLDOWN_MS = 1200;

/** Sensor poll interval in milliseconds. */
const UPDATE_INTERVAL_MS = 80;

/**
 * Calls `onShake` whenever the device is shaken.
 * The callback reference is tracked via a ref so callers can use inline
 * lambdas without accidentally re-subscribing the accelerometer.
 */
export function useShake(onShake: () => void): void {
  // Keep the latest callback without triggering effect re-runs.
  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  const lastShakeTime = useRef<number>(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Total G-force vector magnitude.
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (
        magnitude > SHAKE_THRESHOLD &&
        now - lastShakeTime.current > SHAKE_COOLDOWN_MS
      ) {
        lastShakeTime.current = now;
        onShakeRef.current();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []); // Empty deps — subscription is stable; callback handled via ref.
}
