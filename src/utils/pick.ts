export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Partial<T> => {
  const finalObj: Partial<T> = {};

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      finalObj[key] = obj[key];
    }
  }

  return finalObj;
};
