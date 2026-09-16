import { expect, test } from 'bun:test';

import { objectToFormData, paramsToString } from '~/src/util';

test('FormData 转换', () => {
  const first = new File(['first'], 'first.txt');
  const second = new File(['second'], 'second.txt');
  const formData = objectToFormData({
    files: [first, second],
    keep: 'value',
    skip: undefined,
  });

  expect((formData.getAll('files')[0] as File).name).toBe('first.txt');
  expect((formData.getAll('files')[1] as File).name).toBe('second.txt');
  expect(formData.get('keep')).toBe('value');
  expect(formData.get('skip')).toBeNull();
});

test('查询参数序列化', () => {
  expect(paramsToString({ tags: ['a', undefined, 'b'], skip: undefined })).toBe('tags=a&tags=b');
  expect(paramsToString(new URLSearchParams({ foo: 'bar' }))).toBe('foo=bar');
  expect(paramsToString(null)).toBe('');
  expect(paramsToString('value')).toBe('');
});

test('假值字段', () => {
  const data = { values: [0, false, null, undefined], skip: undefined, empty: [] };
  expect(paramsToString(data)).toBe('values=0&values=false&values=null');
  expect([...objectToFormData(data).entries()]).toEqual([
    ['values', '0'],
    ['values', 'false'],
    ['values', 'null'],
  ]);
});
