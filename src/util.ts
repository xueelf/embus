/** 将数组展开为同名字段，并忽略 undefined。 */
function* fields(payload: object): Generator<[string, unknown]> {
  for (const [key, value] of Object.entries(payload)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        yield [key, item];
      }
    }
  }
}

/** 将对象转换为 FormData，数组使用同名字段，并忽略 undefined。 */
export function objectToFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of fields(payload)) {
    formData.append(key, value instanceof Blob ? value : String(value));
  }
  return formData;
}

/** 将对象转换为查询字符串，数组使用同名参数。 */
export function paramsToString(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (data instanceof URLSearchParams) {
    return data.toString();
  }
  const params = new URLSearchParams();

  for (const [key, value] of fields(data)) {
    params.append(key, String(value));
  }
  return params.toString();
}
