export function parseParams(object: object): string {
  const params = new URLSearchParams();
  const keys = Object.keys(object);

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const value = Reflect.get(object, key);

    params.append(key, value);
  }
  return params.toString();
}

export function parseBody(params?: object): Required<RequestInit['body']> {
  if (!params) {
    return;
  }
  const has_blob = Object.entries(params).some(([_, value]) => value instanceof Blob);

  if (has_blob) {
    const formData = new FormData();
    const keys = Object.keys(params);

    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const value = Reflect.get(params, key);

      formData.append(key, value);
    }
    return formData;
  }
  return JSON.stringify(params);
}

export function objectToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function parseError(error: unknown): string {
  return error instanceof Error ? error.message : objectToString(error);
}
