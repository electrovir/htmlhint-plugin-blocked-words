export function assertDefined<T>(input: T): asserts input is NonNullable<T> {
    expect(input).toBeDefined();
}
