import { DescriptorRegistry, Descriptor, Tag } from '@rnoh/react-native-openharmony/ts';
import { View, Vector2D, BoundingBox } from "../core"


export type RawTouchableView = {
  tag: number,
  /**
   * Relative to application window.
   */
  x: number,
  /**
   * Relative to application window.
   */
  y: number,
  width: number,
  height: number,
  buttonRole: boolean,
}

export class ViewCAPI implements View {
  private tag: number
  private buttonRole: boolean
  private boundingBox: BoundingBox

  constructor({ tag, buttonRole, ...boundingBox }: RawTouchableView) {
    this.tag = tag
    this.buttonRole = buttonRole
    this.boundingBox = boundingBox
  }

  getTag(): number {
    return this.tag
  }

  getBoundingRect(): BoundingBox {
    return { ...this.boundingBox }
  }

  isPositionInBounds({x, y}: {
    x: number;
    y: number
  }): boolean {
    const rect = this.getBoundingRect();
    return (
      x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
    );
  }

  updateBoundingBox(boundingBox: BoundingBox) {
    this.boundingBox = boundingBox
  }

  setButtonRole(buttonRole: boolean) {
    this.buttonRole = buttonRole
  }

  hasButtonRole(): boolean {
    return this.buttonRole
  }
}

export class ViewArkTS implements View {
  constructor(
    private descriptorRegistry: DescriptorRegistry,
    private viewTag: number,
  ) {
  }


  public getTag(): Tag {
    return this.viewTag;
  }

  public isPositionInBounds({x, y}: {
    x: number;
    y: number
  }): boolean {
    const rect = this.getBoundingRect();
    return (
      x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
    );
  }

  public getBoundingRect(): BoundingBox {
    const d = this.getDescriptor();
    if (!d) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const offsetToAbsolutePosition = this.getOffsetToAbsolutePosition();
    return {
      x: d.layoutMetrics.frame.origin.x - offsetToAbsolutePosition.x,
      y: d.layoutMetrics.frame.origin.y - offsetToAbsolutePosition.y,
      width: d.layoutMetrics.frame.size.width,
      height: d.layoutMetrics.frame.size.height,
    };
  }

  private getDescriptor() {
    return this.descriptorRegistry.getDescriptor(this.viewTag);
  }

  private getOffsetToAbsolutePosition(): Vector2D {
    const currentOffset = new Vector2D();
    let parentTag = this.getDescriptor()?.parentTag;
    while (parentTag !== undefined) {
      const d = this.descriptorRegistry.getDescriptor(parentTag);
      currentOffset.add(this.extractScrollOffsetFromDescriptor(d));
      currentOffset.subtract(new Vector2D(d.layoutMetrics.frame.origin));
      parentTag = d.parentTag;
    }
    return currentOffset;
  }

  private extractScrollOffsetFromDescriptor(descriptor: Descriptor<any>) {
    if (descriptor.type !== 'ScrollView') {
      return new Vector2D();
    }
    const scrollViewState: any = descriptor.state;
    return new Vector2D({
      x: scrollViewState.contentOffsetX,
      y: scrollViewState.contentOffsetY,
    });
  }

  public hasButtonRole(): boolean {
    return false;
  }
}
