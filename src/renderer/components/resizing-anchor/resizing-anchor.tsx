import "./resizing-anchor.scss";
import React from "react";
import { action, observable } from "mobx";
import _ from "lodash"
import { findDOMNode } from "react-dom";
import { cssNames, noop } from "../../utils";

export enum ResizeDirection {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

/**
 * ResizeSide is for customizing where the area should be rendered.
 * That location is determined in conjunction with the `ResizeDirection` using the following table:
 *
 * +----------+------------+----------+
 * |          | HORIZONTAL | VERTICAL |
 * +----------+------------+----------+
 * |  LEADING | left       | top      |
 * +----------+------------+----------+
 * | TRAILING | right      | bottom   |
 * +----------+------------+----------+
 */
export enum ResizeSide {
  LEADING = "leading",
  TRAILING = "trailing",
}

/**
 * ResizeGrowthDirection determines how the anchor interprets the drag.
 *
 * Because the origin of the screen is top left a drag from bottom to top
 * results in a negative directional delta. However, if the component being
 * dragged grows in the opposite direction, this needs to be compensated for.
 */
export enum ResizeGrowthDirection {
  TOP_TO_BOTTOM = 1,
  BOTTOM_TO_TOP = -1,
  LEFT_TO_RIGHT = 1,
  RIGHT_TO_LEFT = -1,
}

interface Props {
  direction: ResizeDirection;

  /**
   * getCurrentExtent should return the current prominent dimention in the
   * given resizing direction. Width for HORIZONTAL and height for VERTICAL
   */
  getCurrentExtent: () => number;

  disabled?: boolean;
  placement?: ResizeSide;
  growthDirection?: ResizeGrowthDirection;

  // Ability to restrict which mouse buttons are allowed to resize this component
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
  onlyButtons?: number;

  // onStart is called when the ResizeAnchor is first clicked (mouse down)
  onStart?: () => void;

  // onEnd is called when the ResizeAnchor is released (mouse up)
  onEnd?: () => void;

  /**
   * onDrag is called whenever there is a mousemove event. All calls will be
   * bounded by matching `onStart` and `onEnd` calls.
   */
  onDrag?: (newExtent: number) => void;

  // onDoubleClick is called when the the ResizeAnchor is double clicked
  onDoubleClick?: () => void;

  /**
   * The following two extents represent the max and min values set to `onDrag`
   */
  maxExtent?: number;
  minExtent?: number;

  /**
   * The following events are triggerred with respect to the above values.
   *  - The "__Exceed" call will be made when the unbounded extent goes from
   *    < the above to >= the above
   *  - The "__Subceed" call is similar but is triggered when the unbounded
   *    extent goes from >= the above to < the above.
   */
  onMaxExtentExceed?: () => void;
  onMaxExtentSubceed?: () => void;
  onMinExtentSubceed?: () => void;
  onMinExtentExceed?: () => void;
}

enum MovementTrigger {
  EXCEED_MAX = "exceed",
  SUBCEED_MIN = "subceed",
}

interface MovementCalc {
  newExtent?: number;
  otherTrigger?: MovementTrigger;
  ignore?: boolean;
}

interface Position {
  readonly pageX: number;
  readonly pageY: number;
}

/**
 * Return the direction delta, but ignore drags leading up to a moved item
 *  1. `->|` => return `false`
 *  2. `<-|` => return `directed length (P1, P2)` (negative)
 *  3. `-|>` => return `directed length (M, P2)` (positive)
 *  4. `<|-` => return `directed length (M, P2)` (negative)
 *  5. `|->` => return `directed length (P1, P2)` (positive)
 *  6. `|<-` => return `false`
 * @param P the starting position on the number line
 * @param Q the ending position on the number line
 * @param M a third point that determines if the delta is meaningful
 * @returns the directional difference between including appropriate sign.
 */
function directionDelta(P1: number, P2: number, B: number): number | false {
  if (P1 < B) {
    if (P2 >= B) {
      // case 3
      return Math.abs(B - P2)
    }

    if (P2 < P1) {
      // case 2
      return -Math.abs(P1 - P2)
    }

    // case 1
    return false
  }

  if (P2 < B) {
    // case 4
    return -Math.abs(B - P2)
  }

  if (P1 < P2) {
    // case 5
    return Math.abs(P1 - P2)
  }

  // case 6
  return false
}

export class ResizingAnchor extends React.PureComponent<Props> {
  @observable lastMouseEvent?: MouseEvent
  @observable elem: HTMLElement

  static defaultProps = {
    onStart: noop,
    onDrag: noop,
    onEnd: noop,
    onMaxExtentExceed: noop,
    onMinExtentExceed: noop,
    onMinExtentSubceed: noop,
    onMaxExtentSubceed: noop,
    onDoubleClick: noop,
    disabled: false,
    growthDirection: ResizeGrowthDirection.BOTTOM_TO_TOP,
    maxExtent: Number.POSITIVE_INFINITY,
    minExtent: 0,
    placement: ResizeSide.LEADING,
  }
  static IS_RESIZING = "resizing"

  constructor(props: Props) {
    super(props)
    if (props.maxExtent < props.minExtent) {
      throw new Error("maxExtent must be >= minExtent")
    }
  }

  componentDidMount() {
    this.elem = findDOMNode(this) as HTMLElement
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.onDrag)
    document.removeEventListener("mouseup", this.onDragEnd)
  }

  @action
  onDragInit = (event: React.MouseEvent) => {
    const { onStart, onlyButtons } = this.props

    if (typeof onlyButtons === "number" && onlyButtons !== event.buttons) {
      return
    }

    document.addEventListener("mousemove", this.onDrag)
    document.addEventListener("mouseup", this.onDragEnd)
    document.body.classList.add(ResizingAnchor.IS_RESIZING)

    this.lastMouseEvent = undefined
    onStart()
  }

  calculateDelta(from: Position, to: Position): number | false {
    const boundingBox = this.elem.getBoundingClientRect()

    if (this.props.direction === ResizeDirection.HORIZONTAL) {
      const barX = Math.round(boundingBox.x + (boundingBox.width / 2))
      return directionDelta(from.pageX, to.pageX, barX)
    } else { // direction === ResizeDirection.VERTICAL
      const barY = Math.round(boundingBox.y + (boundingBox.height / 2))
      return directionDelta(from.pageY, to.pageY, barY)
    }
  }

  onDrag = _.throttle((event: MouseEvent) => {
    /**
     * Some notes to help understand the following:
     *  - A browser's origin point is in the top left of the screen
     *  - X increases going from left to right
     *  - Y increases going from top to bottom
     *  - Since the resize bar should always be a rectangle, use its centre
     *    line (in the resizing direction) as the line for determining if
     *    the bar has "jumped around"
     *
     * Desire:
     *  - Always ignore movement in the non-resizing direction
     *  - Figure out how much the user has "dragged" the resize bar
     *  - If the resize bar has jumped around, compensate by ignoring movement
     *    in the resizing direction if it is moving "towards" the resize bar's
     *    new location.
     */

    if (!this.lastMouseEvent) {
      this.lastMouseEvent = event
      return
    }

    const { maxExtent, minExtent, getCurrentExtent, growthDirection } = this.props
    const { onDrag, onMaxExtentExceed, onMinExtentSubceed, onMaxExtentSubceed, onMinExtentExceed } = this.props
    const delta = this.calculateDelta(this.lastMouseEvent, event)
    if (delta === false) {
      return
    }

    const previousExtent = getCurrentExtent()
    const unboundedExtent = previousExtent + (delta * growthDirection)
    const boundedExtent = Math.round(Math.max(minExtent, Math.min(maxExtent, unboundedExtent)))
    onDrag(boundedExtent)

    if (previousExtent <= minExtent && minExtent <= unboundedExtent) {
      onMinExtentExceed()
    } else if (previousExtent >= minExtent && minExtent >= unboundedExtent) {
      onMinExtentSubceed()
    }
    if (previousExtent <= maxExtent && maxExtent <= unboundedExtent) {
      onMaxExtentExceed()
    } else if (previousExtent >= maxExtent && maxExtent >= unboundedExtent) {
      onMaxExtentSubceed()
    }

    this.lastMouseEvent = event
  }, 100)

  @action
  onDragEnd = (event: MouseEvent) => {
    this.props.onEnd()
    document.removeEventListener("mousemove", this.onDrag)
    document.removeEventListener("mouseup", this.onDragEnd)
    document.body.classList.remove(ResizingAnchor.IS_RESIZING)
  }

  render() {
    const { disabled, direction, placement } = this.props
    return <div className={cssNames("ResizingAnchor", direction, placement, { disabled })} onMouseDown={this.onDragInit} />
  }
}
