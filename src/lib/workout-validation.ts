/**
 * Centralized validation for all member workout logging flows.
 * Every logging path (strength, conditioning, history edit) MUST use these.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface DeviationWarning {
  field: string;
  message: string;
}

/** Sanitize input to only allow decimal digits and one dot */
export function sanitizeDecimal(val: string): string {
  let result = "";
  let hasDot = false;
  for (const ch of val) {
    if (ch >= "0" && ch <= "9") result += ch;
    else if (ch === "." && !hasDot) {
      result += ch;
      hasDot = true;
    }
  }
  return result;
}

/** Sanitize input to only allow integer digits */
export function sanitizeInteger(val: string): string {
  return val.replace(/[^0-9]/g, "");
}

/**
 * Validate a weight value.
 * @param value - raw string from input
 * @param required - if true, empty string is an error
 * @returns error message or undefined
 */
export function validateWeight(value: string, required = false): string | undefined {
  if (!value || value.trim() === "") {
    return required ? "Weight is required" : undefined;
  }
  const n = parseFloat(value);
  if (isNaN(n)) return "Weight must be a number";
  if (n <= 0) return "Weight must be greater than 0";
  return undefined;
}

/**
 * Validate a reps value.
 * @param value - raw string from input
 * @param required - if true, empty string is an error
 */
export function validateReps(value: string, required = false): string | undefined {
  if (!value || value.trim() === "") {
    return required ? "Reps is required" : undefined;
  }
  const n = parseInt(value, 10);
  if (isNaN(n)) return "Reps must be a whole number";
  if (n <= 0) return "Reps must be greater than 0";
  if (value.includes(".")) return "Reps must be a whole number";
  return undefined;
}

/**
 * Validate an RPE value (1–10).
 */
export function validateRpe(value: string, required = false): string | undefined {
  if (!value || value.trim() === "") {
    return required ? "RPE is required" : undefined;
  }
  const n = parseInt(value, 10);
  if (isNaN(n)) return "RPE must be a number";
  if (n < 1 || n > 10) return "RPE must be between 1 and 10";
  return undefined;
}

/**
 * Validate rounds (positive integer, optional).
 */
export function validateRounds(value: string): string | undefined {
  if (!value || value.trim() === "") return undefined;
  const n = parseInt(value, 10);
  if (isNaN(n)) return "Rounds must be a number";
  if (n <= 0) return "Rounds must be greater than 0";
  return undefined;
}

/**
 * Validate a complete strength set.
 * Returns array of error messages (empty = valid).
 */
export function validateSet(weight: string, reps: string, rpe: string): string[] {
  const errors: string[] = [];
  const wErr = validateWeight(weight);
  if (wErr) errors.push(wErr);
  const rErr = validateReps(reps);
  if (rErr) errors.push(rErr);
  const rpErr = validateRpe(rpe);
  if (rpErr) errors.push(rpErr);
  return errors;
}

/**
 * Check weight deviation against a reference (previous set or historical average).
 * Returns warning messages (empty = no warning).
 * Threshold: 30% deviation.
 */
export function checkWeightDeviation(
  currentWeight: string,
  referenceWeights: { label: string; value: number }[]
): DeviationWarning[] {
  const warnings: DeviationWarning[] = [];
  if (!currentWeight) return warnings;
  const w = parseFloat(currentWeight);
  if (isNaN(w) || w <= 0) return warnings;

  for (const ref of referenceWeights) {
    if (ref.value > 0 && Math.abs(w - ref.value) / ref.value > 0.3) {
      const direction = w > ref.value ? "higher" : "lower";
      warnings.push({
        field: "weight",
        message: `This weight (${w}kg) is significantly ${direction} than ${ref.label} (${Math.round(ref.value)}kg). Please confirm.`,
      });
    }
  }
  return warnings;
}

/**
 * Validate a conditioning/finisher entry.
 */
export function validateConditioningEntry(
  weight: string,
  rpe: string,
  rounds: string
): string[] {
  const errors: string[] = [];
  const wErr = validateWeight(weight, false);
  if (wErr) errors.push(wErr);
  const rpErr = validateRpe(rpe, false);
  if (rpErr) errors.push(rpErr);
  const rnErr = validateRounds(rounds);
  if (rnErr) errors.push(rnErr);
  return errors;
}