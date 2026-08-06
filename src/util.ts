/** Appends Blob and File values unchanged, and converts other values to strings. */
function appendFormValue(formData: FormData, key: string, value: unknown): void {
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value));
}

/** Converts an object to FormData, using repeated fields for arrays and skipping undefined. */
export function objectToFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) {
          appendFormValue(formData, key, item);
        }
      }
      continue;
    }
    appendFormValue(formData, key, value);
  }
  return formData;
}

/** Converts an object to a query string, using repeated parameters for arrays. */
export function paramsToString(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (data instanceof URLSearchParams) {
    return data.toString();
  }
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) {
          params.append(key, String(item));
        }
      }
      continue;
    }
    params.append(key, String(value));
  }
  return params.toString();
}
