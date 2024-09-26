export function assignDeep<T extends object>(target: any, ...sources: unknown[]): T {
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    if (!source || typeof source !== 'object') {
      return target;
    }
    Object.entries(source).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') {
        target[key] = value;
        return;
      }
      if (Array.isArray(value)) {
        target[key] = [];
      }
      if (typeof target[key] !== 'object' || !target[key]) {
        target[key] = {};
      }
      assignDeep(target[key], value);
    });
  }
  return target;
}

export function cloneDeep<T extends object>(object: T): T {
  return JSON.parse(JSON.stringify(object));
}

export function parseError(error: unknown): string {
  return error instanceof Error ? error.message : objectToString(error);
}

export function paramsToString(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  const params = new URLSearchParams();
  const keys = Object.keys(data);

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const value = Reflect.get(data, key);

    params.append(key, value);
  }
  return params.toString();
}

export function objectToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function objectToFormData(params: object): FormData {
  const formData = new FormData();
  const keys = Object.keys(params);

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const value = Reflect.get(params, key);

    formData.append(key, value);
  }
  return formData;
}
