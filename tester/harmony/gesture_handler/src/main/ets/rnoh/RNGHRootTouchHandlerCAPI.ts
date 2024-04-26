import { RNGHRootTouchHandlerArkTS } from "./RNGHRootTouchHandlerArkTS"
import { TouchEvent as TouchEventArkTS, TouchType, TouchObject } from "./types"
import { RNGHLogger } from "../core"

type RawTouchPoint = {
  pointerId: number
  windowX: number
  windowY: number

}

export type RawTouchEvent = {
  action: number,
  actionTouch: RawTouchPoint,
  touchPoints: RawTouchPoint[],
  sourceType: number,
  timestamp: number
}

class TouchEvent {
  constructor(private raw: RawTouchEvent) {
  }

  asTouchEventArkTS(): TouchEventArkTS {
    const touchType = this.touchTypeFromAction(this.raw.action)
    return {
      type: this.touchTypeFromAction(this.raw.action),
      touches: this.raw.touchPoints.map(tp => this.touchObjectFromTouchPoint(tp, touchType)),
      changedTouches: this.raw.touchPoints.map(tp => this.touchObjectFromTouchPoint(tp, touchType)),
      timestamp: this.raw.timestamp
    }
  }

  private touchTypeFromAction(action: number): TouchType {
    switch (action) {
      case 1:
        return TouchType.Down
      case 2:
        return TouchType.Move
      case 3:
        return TouchType.Up
      default:
        return TouchType.Cancel
    }
  }

  private touchObjectFromTouchPoint(touchPoint: RawTouchPoint, touchType: TouchType): TouchObject {
    return {
      id: touchPoint.pointerId,
      windowX: touchPoint.windowX,
      windowY: touchPoint.windowY,
      x: touchPoint.windowX,
      y: touchPoint.windowY,
      type: touchType
    }
  }
}

export class RNGHRootTouchHandlerCAPI {
  private logger: RNGHLogger

  constructor(logger: RNGHLogger, private touchHandlerArkTS: RNGHRootTouchHandlerArkTS) {
    this.logger = logger.cloneWithPrefix("RNGHRootTouchHandlerCAPI")
  }

  handleTouch(rawTouchEvent: RawTouchEvent) {
    this.logger.cloneWithPrefix("handleTouch").debug(JSON.stringify(rawTouchEvent))
    this.touchHandlerArkTS.handleTouch(new TouchEvent(rawTouchEvent).asTouchEventArkTS())
  }
}

