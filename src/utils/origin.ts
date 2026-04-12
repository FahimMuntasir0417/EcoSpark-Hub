const toOrigin = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const getAllowedOrigins = (...values: Array<string | undefined | null>) => {
  const origins = new Set<string>();

  values.forEach((value) => {
    const origin = toOrigin(value);

    if (origin) {
      origins.add(origin);
    }
  });

  return [...origins];
};
