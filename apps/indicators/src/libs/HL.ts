export class HL {
  public bars: number;
  public previousPrices: number[];

  constructor(bars: number) {
    this.bars = Math.max(1, Math.floor(bars));
    this.previousPrices = [];
  }

  add(value: number) {
    this.previousPrices.push(Number(value));
    if (this.previousPrices.length > Number(this.bars)) {
      this.previousPrices.shift();
    }
  }

  getLow(): number | undefined {
    if (this.previousPrices.length === 0) return undefined;
    let low = this.previousPrices[0];
    for (let i = 1; i < this.previousPrices.length; i++) {
      if (this.previousPrices[i] < low) low = this.previousPrices[i];
    }
    return low;
  }

  getHigh(): number | undefined {
    if (this.previousPrices.length === 0) return undefined;
    let high = this.previousPrices[0];
    for (let i = 1; i < this.previousPrices.length; i++) {
      if (this.previousPrices[i] > high) high = this.previousPrices[i];
    }
    return high;
  }

  isStable(): boolean {
    return this.bars == this.previousPrices.length;
  }
}
