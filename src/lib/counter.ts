export class CounterSet<T> {
  private counts = new Map<T, number>();

  public items() {
    return this.counts.keys();
  }

  public has(value: T) {
    return this.counts.has(value);
  }

  public retain(value: T) {
    const count = this.counts.get(value) ?? 0;
    this.counts.set(value, count + 1);
  }

  public release(value: T) {
    const count = this.counts.get(value);
    if (count === undefined) {
      return;
    }

    if (count <= 1) {
      this.counts.delete(value);
    } else {
      this.counts.set(value, count - 1);
    }
  }
}
