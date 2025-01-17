import { Point } from '@rnoh/react-native-openharmony/ts';
import {
  GestureHandler,
  IncomingEvent,
  EventType,
  PointerType,
  TouchEventType,
  Touch,
  RNGHLogger,
  View
} from '../core';
import { TouchEvent, TouchType, TouchObject } from './types';


export class RNGHViewController {
  private activePointerIds = new Set<number>();
  private pointerIdsInBounds = new Set<number>();
  private gestureHandlers = new Set<GestureHandler>();
  private view: View;
  private logger: RNGHLogger;

  constructor(view: View, logger: RNGHLogger) {
    this.logger = logger.cloneAndJoinPrefix(`RNGHViewTouchHandler`)
    this.view = view;
  }

  attachGestureHandler(gestureHandler: GestureHandler) {
    this.gestureHandlers.add(gestureHandler)
  }

  handleTouch(e: TouchEvent) {
    const logger = this.logger.cloneAndJoinPrefix("handleTouch")
    for (const changedTouch of e.changedTouches) {
      if (this.shouldSkipTouch(changedTouch)) {
        continue;
      }
      const wasInBounds = this.pointerIdsInBounds.has(changedTouch.id);
      const isInBounds = this.isInBounds({
        x: changedTouch.windowX,
        y: changedTouch.windowY,
      });
      logger.debug(
        {
          viewTag: this.view.getTag(),
          type: changedTouch.type,
          wasInBounds,
          isInBounds,
        },
      );
      const adaptedEvent = this.adaptTouchEvent(e, changedTouch);
      this.gestureHandlers.forEach(gh => {
        switch (adaptedEvent.eventType) {
          case EventType.DOWN:
            gh.onPointerDown(adaptedEvent);
            break;
          case EventType.ADDITIONAL_POINTER_DOWN:
            gh.onAdditionalPointerAdd(adaptedEvent);
            break;
          case EventType.UP:
            gh.onPointerUp(adaptedEvent);
            break;
          case EventType.ADDITIONAL_POINTER_UP:
            gh.onAdditionalPointerRemove(adaptedEvent);
            break;
          case EventType.MOVE:
            if (!wasInBounds && !isInBounds) {
              gh.onPointerOutOfBounds(adaptedEvent);
            } else {
              gh.onPointerMove(adaptedEvent);
            }
            break;
          case EventType.ENTER:
            gh.onPointerEnter(adaptedEvent);
            break;
          case EventType.OUT:
            gh.onPointerOut(adaptedEvent);
            break;
          case EventType.CANCEL:
            gh.onPointerCancel(adaptedEvent);
            break;
        }
      })
    }
  }

  private shouldSkipTouch(changedTouch: TouchObject): boolean {
    return (
      changedTouch.type === TouchType.Down &&
        !this.isInBounds({
          x: changedTouch.windowX,
          y: changedTouch.windowY,
        })
    );
  }

  private adaptTouchEvent(
    e: TouchEvent,
    changedTouch: TouchObject,
  ): IncomingEvent {
    const xAbsolute = changedTouch.windowX;
    const yAbsolute = changedTouch.windowY;

    const eventType = this.mapTouchTypeToEventType(
      changedTouch.type,
      this.isInBounds({ x: xAbsolute, y: yAbsolute }),
      changedTouch.id,
      this.pointerIdsInBounds.has(changedTouch.id),
    );
    this.logger.cloneAndJoinPrefix("adaptTouchEvent")
      .debug({ eventType, activePointersCount: this.activePointerIds.size })
    this.updateIsInBoundsByPointerId(
      changedTouch.type,
      changedTouch.id,
      xAbsolute,
      yAbsolute,
    );
    this.updateActivePointers(changedTouch.type, changedTouch.id);
    return {
      x: xAbsolute,
      y: yAbsolute,
      offsetX: xAbsolute - this.view.getBoundingRect().x,
      offsetY: yAbsolute - this.view.getBoundingRect().y,
      pointerId: changedTouch.id,
      eventType: eventType,
      pointerType: PointerType.TOUCH,
      buttons: 0,
      time: e.timestamp,
      allTouches: e.touches.map(touch => this.mapTouchObjectToTouch(touch)),
      changedTouches: e.changedTouches.map(touch =>
      this.mapTouchObjectToTouch(touch),
      ),
      touchEventType: this.mapTouchTypeToTouchEventType(changedTouch.type),
    };
  }

  private updateIsInBoundsByPointerId(
    touchType: TouchType,
    pointerId: number,
    x: number,
    y: number,
  ) {
    switch (touchType) {
      case TouchType.Down:
        if (this.isInBounds({ x, y })) {
          this.pointerIdsInBounds.add(pointerId);
        }
        break;
      case TouchType.Move:
        if (this.isInBounds({
          x,
          y
        })) {
          this.pointerIdsInBounds.add(pointerId);
        } else {
          this.pointerIdsInBounds.delete(pointerId);
        }
        break;
      case TouchType.Up:
        this.pointerIdsInBounds.delete(pointerId);
        break;
      case TouchType.Cancel:
        this.pointerIdsInBounds.delete(pointerId);
        break;
    }
  }

  private isInBounds(point: Point): boolean {
    const rect = this.view.getBoundingRect();
    this.logger.cloneAndJoinPrefix("isInBounds").debug({ rect })
    return this.view.isPositionInBounds(point);
  }

  private updateActivePointers(touchType: TouchType, pointerId: number): void {
    switch (touchType) {
      case TouchType.Down:
        this.activePointerIds.add(pointerId);
        break;
      case TouchType.Up:
        this.activePointerIds.delete(pointerId);
        break;
      case TouchType.Cancel:
        this.activePointerIds.clear();
        break;
      default:
        return;
    }
  }

  private mapTouchObjectToTouch(touchObject: TouchObject): Touch {
    return {
      id: touchObject.id,
      x: touchObject.x,
      y: touchObject.y,
      absoluteX: touchObject.windowX,
      absoluteY: touchObject.windowY,
    };
  }

  private mapTouchTypeToEventType(
    touchType: TouchType,
    isCurrentlyInBounds: boolean,
    pointerId: number,
    wasInBounds: boolean,
  ): EventType {
    /**
     * If user manages to drag finger out of GestureHandlerRootView,
     * we don't receive UP event.
     */
    let activePointersCount = this.activePointerIds.size
    if (this.activePointerIds.has(pointerId)) {
      activePointersCount--;
    }

    switch (touchType) {
      case TouchType.Down:
        if (activePointersCount > 0) {
          return EventType.ADDITIONAL_POINTER_DOWN;
        } else {
          return EventType.DOWN;
        }
      case TouchType.Up:
        if (activePointersCount > 1) {
          return EventType.ADDITIONAL_POINTER_UP;
        } else {
          return EventType.UP;
        }
      case TouchType.Move:
        if (isCurrentlyInBounds) {
          return wasInBounds ? EventType.MOVE : EventType.ENTER;
        } else {
          return wasInBounds ? EventType.OUT : EventType.MOVE;
        }
      case TouchType.Cancel:
        return EventType.CANCEL;
      default:
        console.error('RNGH', 'Unknown touchType:', touchType);
        throw new Error('Unknown touchType');
    }
  }

  private mapTouchTypeToTouchEventType(touchType: TouchType): TouchEventType {
    switch (touchType) {
      case TouchType.Down:
        return TouchEventType.DOWN;
      case TouchType.Up:
        return TouchEventType.UP;
      case TouchType.Move:
        return TouchEventType.MOVE;
      case TouchType.Cancel:
        return TouchEventType.CANCELLED;
      default:
        return TouchEventType.UNDETERMINED;
    }
  }
}
