import { makeId } from './ids';

describe('makeId', () => {
  it('creates prefixed UUID identifiers without collisions', () => {
    const first = makeId('O');
    const second = makeId('O');

    expect(first).toMatch(
      /^O-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second).not.toBe(first);
  });
});
