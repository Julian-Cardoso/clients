import {
  CdkFixedSizeVirtualScroll,
  FixedSizeVirtualScrollStrategy,
  VIRTUAL_SCROLL_STRATEGY,
} from "@angular/cdk/scrolling";
import {
  Directive,
  ElementRef,
  forwardRef,
  NgZone
} from "@angular/core";

// Custom virtual scroll strategy for cdk-virtual-scroll
// Uses a sample list item to set the itemSize for FixedSizeVirtualScrollStrategy
export class CipherListVirtualScrollStrategy extends FixedSizeVirtualScrollStrategy {
  private checkItemSizeCallback: () => void;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(
    itemSize: number,
    minBufferPx: number,
    maxBufferPx: number,
    checkItemSizeCallback: () => void,
    private zone: NgZone,
  ) {
    super(itemSize, minBufferPx, maxBufferPx);
    this.checkItemSizeCallback = checkItemSizeCallback;
  }

  override onContentRendered(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Executa fora do Angular para evitar ciclos extras de change detection
    this.zone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.zone.run(this.checkItemSizeCallback);
      }, 500);
    });
  }
}

export function cipherListVirtualScrollStrategyFactory(
  dir: CipherListVirtualScroll,
): CipherListVirtualScrollStrategy {
  return dir.scrollStrategy;
}

@Directive({
  selector: "cdk-virtual-scroll-viewport[itemSize]",
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: cipherListVirtualScrollStrategyFactory,
      deps: [forwardRef(() => CipherListVirtualScroll)],
    },
  ],
})
// FIXME(https://bitwarden.atlassian.net/browse/PM-28232): Use Directive suffix
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class CipherListVirtualScroll extends CdkFixedSizeVirtualScroll {
  readonly scrollStrategy: CipherListVirtualScrollStrategy;

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
  ) {
    super();

    this.scrollStrategy = new CipherListVirtualScrollStrategy(
      this.itemSize,
      this.minBufferPx,
      this.maxBufferPx,
      this.checkAndUpdateItemSize,
      this.zone,
    );
  }

  private checkAndUpdateItemSize = (): void => {
    const sampleItem = this.findSampleItem();
    const newItemSize = sampleItem?.offsetHeight;

    if (newItemSize && newItemSize !== this.itemSize) {
      this.updateItemSize(newItemSize);
    }
  };

  private findSampleItem(): HTMLElement | null {
    return this.host.nativeElement.querySelector(".virtual-scroll-item");
  }

  private updateItemSize(newSize: number): void {
    this.itemSize = newSize;
    this.scrollStrategy.updateItemAndBufferSize(
      this.itemSize,
      this.minBufferPx,
      this.maxBufferPx,
    );
  }
}
