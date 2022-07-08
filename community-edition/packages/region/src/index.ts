/**
 * Copyright © INOVUA TRADING.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hasOwn from '../../../packages/hasOwn';

import applyStatics from './statics';
import EventEmitter, { ValidEventTypes } from 'eventemitter3';

import inherits from './inherits';
import VALIDATE from './validate';

import {
  Region,
  RegionType,
  Position,
  Rectangle,
  Dimensions,
  PointPositions,
  PointPositionsValue,
} from './types';

var objectToString = Object.prototype.toString;

var isObject = function(value: any) {
  return objectToString.apply(value) === '[object Object]';
};

function copyList(
  source: Position,
  target: Region | {},
  list: string[]
): Position {
  if (source) {
    list.forEach(function(key: string) {
      if (hasOwn(source, key)) {
        (target as any)[key] = (source as any)[key];
      }
    });
  }

  return target;
}

/**
 * @class Region
 *
 * The Region is an abstraction that allows the developer to refer to rectangles on the screen,
 * and move them around, make diffs and unions, detect intersections, compute areas, etc.
 *
 * ## Creating a region
 *      var region = require('region')({
 *          top  : 10,
 *          left : 10,
 *          bottom: 100,
 *          right : 100
 *      })
 *      //this region is a square, 90x90, starting from (10,10) to (100,100)
 *
 *      var second = require('region')({ top: 10, left: 100, right: 200, bottom: 60})
 *      var union  = region.getUnion(second)
 *
 *      //the "union" region is a union between "region" and "second"
 */

var POINT_POSITIONS: PointPositions = {
  cy: 'YCenter',
  cx: 'XCenter',
  t: 'Top',
  tc: 'TopCenter',
  tl: 'TopLeft',
  tr: 'TopRight',
  b: 'Bottom',
  bc: 'BottomCenter',
  bl: 'BottomLeft',
  br: 'BottomRight',
  l: 'Left',
  lc: 'LeftCenter',
  r: 'Right',
  rc: 'RightCenter',
  c: 'Center',
};

/**
 * @constructor
 *
 * Construct a new Region.
 *
 * Example:
 *
 *      var r = new Region({ top: 10, left: 20, bottom: 100, right: 200 })
 *
 *      //or, the same, but with numbers (can be used with new or without)
 *
 *      r = Region(10, 200, 100, 20)
 *
 *      //or, with width and height
 *
 *      r = Region({ top: 10, left: 20, width: 180, height: 90})
 *
 * @param {Number|Object} top The top pixel position, or an object with top, left, bottom, right properties. If an object is passed,
 * instead of having bottom and right, it can have width and height.
 *
 * @param {Number} right The right pixel position
 * @param {Number} bottom The bottom pixel position
 * @param {Number} left The left pixel position
 *
 * @return {Region} this
 */

var REGION: RegionType = function(
  this: Region & EventEmitter<ValidEventTypes, unknown>,
  ...args
): any {
  const [top, right, bottom, left] = args;
  if (!(this instanceof REGION)) {
    return new (REGION as any)(...args);
  }

  EventEmitter.call(this);

  if (isObject(top)) {
    copyList(top, this, ['top', 'right', 'bottom', 'left']);

    if (top.bottom == null && top.height != null) {
      this.bottom = this.top! + top.height;
    }
    if (top.right == null && top.width != null) {
      this.right = this.left! + top.width;
    }

    if (this.right == null) {
      this.right = this.left;
    }
    if (this.bottom == null) {
      this.bottom = this.top;
    }

    if (top.emitChangeEvents) {
      this.emitChangeEvents = top.emitChangeEvents;
    }
  } else {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  (this as any)[0] = this.left;
  (this as any)[1] = this.top;

  VALIDATE(this);
};

inherits(REGION, EventEmitter);

Object.assign(REGION.prototype, {
  /**
   * @cfg {Boolean} emitChangeEvents If this is set to true, the region
   * will emit 'changesize' and 'changeposition' whenever the size or the position changes
   */
  emitChangeEvents: false,

  /**
   * Returns this region, or a clone of this region
   * @param  {Boolean} [clone] If true, this method will return a clone of this region
   * @return {Region}       This region, or a clone of this
   */
  getRegion: function(this: Region, clone: boolean): Region {
    return clone ? this.clone() : this;
  },

  /**
   * Sets the properties of this region to those of the given region
   * @param {Region/Object} reg The region or object to use for setting properties of this region
   * @return {Region} this
   */
  setRegion: function(this: Region, reg: Region): Region {
    if (reg instanceof REGION) {
      this.set(reg.get());
    } else {
      this.set(reg);
    }

    return this;
  },

  /**
   * Returns true if this region is valid, false otherwise
   *
   * @param  {Region} region The region to check
   * @return {Boolean}        True, if the region is valid, false otherwise.
   * A region is valid if
   *  * left <= right  &&
   *  * top  <= bottom
   */
  validate: function(this: Region): boolean {
    return REGION.validate!(this);
  },

  _before: function(this: Region): Position | undefined {
    if (this.emitChangeEvents) {
      return copyList(this, {}, ['left', 'top', 'bottom', 'right']);
    }
  },

  _after: function(this: Region, before?: Region): void {
    if (this.emitChangeEvents) {
      if (this.top != before!.top || this.left != before!.left) {
        this.emitPositionChange();
      }

      if (this.right != before!.right || this.bottom != before!.bottom) {
        this.emitSizeChange();
      }
    }
  },

  notifyPositionChange: function(this: Region): void {
    this.emit!('changeposition', this);
  },

  emitPositionChange: function(this: Region): void {
    this.notifyPositionChange();
  },

  notifySizeChange: function(this: Region): void {
    this.emit!('changesize', this);
  },

  emitSizeChange: function(this: Region): void {
    this.notifySizeChange();
  },

  /**
   * Add the given amounts to each specified side. Example
   *
   *      region.add({
   *          top: 50,    //add 50 px to the top side
   *          bottom: -100    //substract 100 px from the bottom side
   *      })
   *
   * @param {Object} directions
   * @param {Number} [directions.top]
   * @param {Number} [directions.left]
   * @param {Number} [directions.bottom]
   * @param {Number} [directions.right]
   *
   * @return {Region} this
   */
  add: function(this: Region, directions: Position): Region {
    var before = this._before();
    var direction;

    for (direction in directions)
      if (hasOwn(directions, direction)) {
        (this as any)[direction] += (directions as any)[direction];
      }

    this[0] = this.left;
    this[1] = this.top;

    this._after(before);

    return this;
  },

  /**
   * The same as {@link #add}, but substracts the given values
   * @param {Object} directions
   * @param {Number} [directions.top]
   * @param {Number} [directions.left]
   * @param {Number} [directions.bottom]
   * @param {Number} [directions.right]
   *
   * @return {Region} this
   */
  substract: function(this: Region, directions: Position): Region {
    var before = this._before();
    var direction;

    for (direction in directions)
      if (hasOwn(directions, direction)) {
        (this as any)[direction] -= (directions as any)[direction];
      }

    this[0] = this.left;
    this[1] = this.top;

    this._after(before);

    return this;
  },

  /**
   * Retrieves the size of the region.
   * @return {Object} An object with {width, height}, corresponding to the width and height of the region
   */
  getSize: function(this: Region): Dimensions {
    return {
      width: this.width,
      height: this.height,
    };
  },

  /**
   * Move the region to the given position and keeps the region width and height.
   *
   * @param {Object} position An object with {top, left} properties. The values in {top,left} are used to move the region by the given amounts.
   * @param {Number} [position.left]
   * @param {Number} [position.top]
   *
   * @return {Region} this
   */
  setPosition: function(this: Region, position: Position): Region {
    var width = this.width;
    var height = this.height;

    if (position.left != undefined) {
      position.right = position.left + width!;
    }

    if (position.top != undefined) {
      position.bottom = position.top + height!;
    }

    return this.set(position);
  },

  /**
   * Sets both the height and the width of this region to the given size.
   *
   * @param {Number} size The new size for the region
   * @return {Region} this
   */
  setSize: function(this: Region, size: Dimensions): Region {
    if (size.height != undefined && size.width != undefined) {
      return this.set({
        right: this.left! + size.width,
        bottom: this.top + size.height,
      });
    }

    if (size.width != undefined) {
      this.setWidth(size.width);
    }

    if (size.height != undefined) {
      this.setHeight(size.height);
    }

    return this;
  },

  /**
   * @chainable
   *
   * Sets the width of this region
   * @param {Number} width The new width for this region
   * @return {Region} this
   */
  setWidth: function(this: Region, width: number): Region {
    return this.set({
      right: this.left! + width,
    });
  },

  /**
   * @chainable
   *
   * Sets the height of this region
   * @param {Number} height The new height for this region
   * @return {Region} this
   */
  setHeight: function(this: Region, height: number): Region {
    return this.set({
      bottom: this.top + height,
    });
  },

  /**
   * Sets the given properties on this region
   *
   * @param {Object} directions an object containing top, left, and EITHER bottom, right OR width, height
   * @param {Number} [directions.top]
   * @param {Number} [directions.left]
   *
   * @param {Number} [directions.bottom]
   * @param {Number} [directions.right]
   *
   * @param {Number} [directions.width]
   * @param {Number} [directions.height]
   *
   *
   * @return {Region} this
   */
  set: function(this: Region, directions: Rectangle): Region {
    var before = this._before();

    copyList(directions, this, ['left', 'top', 'bottom', 'right']);

    if (directions.bottom == null && directions.height != null) {
      this.bottom = this.top + directions.height;
    }
    if (directions.right == null && directions.width != null) {
      this.right = this.left! + directions.width;
    }

    (this as any)[0] = this.left;
    (this as any)[1] = this.top;

    this._after(before);

    return this;
  },

  /**
   * Retrieves the given property from this region. If no property is given, return an object
   * with {left, top, right, bottom}
   *
   * @param {String} [dir] the property to retrieve from this region
   * @return {Number/Object}
   */
  get: function(this: Region, dir: string): Region {
    return dir
      ? (this as any)[dir]
      : copyList(this, {}, ['left', 'right', 'top', 'bottom']);
  },

  /**
   * Shifts this region to either top, or left or both.
   * Shift is similar to {@link #add} by the fact that it adds the given dimensions to top/left sides, but also adds the given dimensions
   * to bottom and right
   *
   * @param {Object} directions
   * @param {Number} [directions.top]
   * @param {Number} [directions.left]
   *
   * @return {Region} this
   */
  shift: function(this: Region, directions: Position): Region {
    var before = this._before();

    if (directions.top) {
      this.top += directions.top;
      this.bottom! += directions.top;
    }

    if (directions.left) {
      this.left! += directions.left;
      this.right! += directions.left;
    }

    this[0] = this.left;
    this[1] = this.top;

    this._after(before);

    return this;
  },

  /**
   * Same as {@link #shift}, but substracts the given values
   * @chainable
   *
   * @param {Object} directions
   * @param {Number} [directions.top]
   * @param {Number} [directions.left]
   *
   * @return {Region} this
   */
  unshift: function(this: Region, directions: Position): Region {
    if (directions.top) {
      directions.top *= -1;
    }

    if (directions.left) {
      directions.left *= -1;
    }

    return this.shift(directions);
  },

  /**
   * Compare this region and the given region. Return true if they have all the same size and position
   * @param  {Region} region The region to compare with
   * @return {Boolean}       True if this and region have same size and position
   */
  equals: function(this: Region, region: Region): boolean {
    return this.equalsPosition(region) && this.equalsSize(region);
  },

  /**
   * Returns true if this region has the same bottom,right properties as the given region
   * @param  {Region/Object} size The region to compare against
   * @return {Boolean}       true if this region is the same size as the given size
   */
  equalsSize: function(this: Region, size: Region): boolean {
    var isInstance = size instanceof REGION;

    var s = {
      width: size.width == null && isInstance ? size.getWidth() : size.width,

      height:
        size.height == null && isInstance ? size.getHeight() : size.height,
    };
    return this.getWidth() == s.width && this.getHeight() == s.height;
  },

  /**
   * Returns true if this region has the same top,left properties as the given region
   * @param  {Region} region The region to compare against
   * @return {Boolean}       true if this.top == region.top and this.left == region.left
   */
  equalsPosition: function(this: Region, region: Region): boolean {
    return this.top == region.top && this.left == region.left;
  },

  /**
   * Adds the given ammount to the left side of this region
   * @param {Number} left The ammount to add
   * @return {Region} this
   */
  addLeft: function(this: Region, left: number): Region {
    var before = this._before();

    this.left = this[0] = this.left! + left;

    this._after(before);

    return this;
  },

  /**
   * Adds the given ammount to the top side of this region
   * @param {Number} top The ammount to add
   * @return {Region} this
   */
  addTop: function(this: Region, top: number): Region {
    var before = this._before();

    this.top = this[1] = this.top + top;

    this._after(before);

    return this;
  },

  /**
   * Adds the given ammount to the bottom side of this region
   * @param {Number} bottom The ammount to add
   * @return {Region} this
   */
  addBottom: function(this: Region, bottom: number): Region {
    var before = this._before();

    this.bottom! += bottom;

    this._after(before);

    return this;
  },

  /**
   * Adds the given ammount to the right side of this region
   * @param {Number} right The ammount to add
   * @return {Region} this
   */
  addRight: function(this: Region, right: number): Region {
    var before = this._before();

    this.right! += right;

    this._after(before);

    return this;
  },

  /**
   * Minimize the top side.
   * @return {Region} this
   */
  minTop: function(this: Region): Region {
    return this.expand({ top: 1 });
  },
  /**
   * Minimize the bottom side.
   * @return {Region} this
   */
  maxBottom: function(this: Region): Region {
    return this.expand({ bottom: 1 });
  },
  /**
   * Minimize the left side.
   * @return {Region} this
   */
  minLeft: function(this: Region): Region {
    return this.expand({ left: 1 });
  },
  /**
   * Maximize the right side.
   * @return {Region} this
   */
  maxRight: function(this: Region): Region {
    return this.expand({ right: 1 });
  },

  /**
   * Expands this region to the dimensions of the given region, or the document region, if no region is expanded.
   * But only expand the given sides (any of the four can be expanded).
   *
   * @param {Object} directions
   * @param {Boolean} [directions.top]
   * @param {Boolean} [directions.bottom]
   * @param {Boolean} [directions.left]
   * @param {Boolean} [directions.right]
   *
   * @param {Region} [region] the region to expand to, defaults to the document region
   * @return {Region} this region
   */
  expand: function(this: Region, directions: Position, region: Region): Region {
    var docRegion = region || REGION.getDocRegion!();
    var list = [];
    var direction;
    var before = this._before();

    for (direction in directions)
      if (hasOwn(directions, direction)) {
        list.push(direction);
      }

    copyList(docRegion, this, list);

    this[0] = this.left;
    this[1] = this.top;

    this._after(before);

    return this;
  },

  /**
   * Returns a clone of this region
   * @return {Region} A new region, with the same position and dimension as this region
   */
  clone: function(this: Region): Region {
    return new (REGION as any)({
      top: this.top,
      left: this.left,
      right: this.right,
      bottom: this.bottom,
    });
  },

  /**
   * Returns true if this region contains the given point
   * @param {Number/Object} x the x coordinate of the point
   * @param {Number} [y] the y coordinate of the point
   *
   * @return {Boolean} true if this region constains the given point, false otherwise
   */
  containsPoint: function(this: Region, x: any, y: number): boolean {
    if (arguments.length == 1) {
      y = x.y;
      x = x.x;
    }

    return (
      this.left! <= x && x <= this.right! && this.top <= y && y <= this.bottom!
    );
  },

  /**
   *
   * @param region
   *
   * @return {Boolean} true if this region contains the given region, false otherwise
   */
  containsRegion: function(this: Region, region: Region): boolean {
    return (
      this.containsPoint(region.left, region.top) &&
      this.containsPoint(region.right, region.bottom!)
    );
  },

  /**
   * Returns an object with the difference for {top, bottom} positions betwen this and the given region,
   *
   * See {@link #diff}
   * @param  {Region} region The region to use for diff
   * @return {Object}        {top,bottom}
   */
  diffHeight: function(this: Region, region: Region): Position {
    return this.diff(region, { top: true, bottom: true });
  },

  /**
   * Returns an object with the difference for {left, right} positions betwen this and the given region,
   *
   * See {@link #diff}
   * @param  {Region} region The region to use for diff
   * @return {Object}        {left,right}
   */
  diffWidth: function(this: Region, region: Region): Position {
    return this.diff(region, { left: true, right: true });
  },

  /**
   * Returns an object with the difference in sizes for the given directions, between this and region
   *
   * @param  {Region} region     The region to use for diff
   * @param  {Object} directions An object with the directions to diff. Can have any of the following keys:
   *  * left
   *  * right
   *  * top
   *  * bottom
   *
   * @return {Object} and object with the same keys as the directions object, but the values being the
   * differences between this region and the given region
   */
  diff: function(
    this: Region,
    region: Region,
    directions: {
      top?: boolean;
      bottom?: boolean;
      left?: boolean;
      right?: boolean;
    }
  ): Position {
    var result = {};
    var dirName;

    for (dirName in directions)
      if (hasOwn(directions, dirName)) {
        (result as any)[dirName] =
          (this as any)[dirName] - (region as any)[dirName];
      }

    return result;
  },

  /**
   * Returns the position, in {left,top} properties, of this region
   *
   * @return {Object} {left,top}
   */
  getPosition: function(this: Region): Position {
    return {
      left: this.left,
      top: this.top,
    };
  },

  /**
   * Returns the point at the given position from this region.
   *
   * @param {String} position Any of:
   *
   *  * 'cx' - See {@link #getPointXCenter}
   *  * 'cy' - See {@link #getPointYCenter}
   *  * 'b'  - See {@link #getPointBottom}
   *  * 'bc' - See {@link #getPointBottomCenter}
   *  * 'l'  - See {@link #getPointLeft}F
   *  * 'lc' - See {@link #getPointLeftCenter}
   *  * 't'  - See {@link #getPointTop}
   *  * 'tc' - See {@link #getPointTopCenter}
   *  * 'r'  - See {@link #getPointRight}
   *  * 'rc' - See {@link #getPointRightCenter}
   *  * 'c'  - See {@link #getPointCenter}
   *  * 'tl' - See {@link #getPointTopLeft}
   *  * 'bl' - See {@link #getPointBottomLeft}
   *  * 'br' - See {@link #getPointBottomRight}
   *  * 'tr' - See {@link #getPointTopRight}
   *
   * @param {Boolean} asLeftTop
   *
   * @return {Object} either an object with {x,y} or {left,top} if asLeftTop is true
   */
  getPoint: function(
    position: PointPositionsValue,
    asLeftTop: boolean
  ): { left: number; top: number } | { x: number; y: number } {
    if (!POINT_POSITIONS[position]) {
      console.warn(
        'The position ',
        position,
        ' could not be found! Available options are tl, bl, tr, br, l, r, t, b.'
      );
    }

    var method = 'getPoint' + POINT_POSITIONS[position],
      result = (this as any)[method]();

    if (asLeftTop) {
      return {
        left: result.x,
        top: result.y,
      };
    }

    return result;
  },

  /**
   * Returns a point with x = null and y being the middle of the left region segment
   * @return {Object} {x,y}
   */
  getPointYCenter: function(this: Region): { x: null; y: number } {
    return { x: null, y: this.top + this.getHeight() / 2 };
  },

  /**
   * Returns a point with y = null and x being the middle of the top region segment
   * @return {Object} {x,y}
   */
  getPointXCenter: function(this: Region): { x: number; y: null } {
    return { x: this.left! + this.getWidth() / 2, y: null };
  },

  /**
   * Returns a point with x = null and y the region top position on the y axis
   * @return {Object} {x,y}
   */
  getPointTop: function(this: Region): { x: null; y: number } {
    return { x: null, y: this.top };
  },

  /**
   * Returns a point that is the middle point of the region top segment
   * @return {Object} {x,y}
   */
  getPointTopCenter: function(this: Region): { x: number; y: number } {
    return { x: this.left! + this.getWidth() / 2, y: this.top };
  },

  /**
   * Returns a point that is the top-left point of the region
   * @return {Object} {x,y}
   */
  getPointTopLeft: function(this: Region): { x?: number; y: number } {
    return { x: this.left, y: this.top };
  },

  /**
   * Returns a point that is the top-right point of the region
   * @return {Object} {x,y}
   */
  getPointTopRight: function(this: Region): { x?: number; y: number } {
    return { x: this.right, y: this.top };
  },

  /**
   * Returns a point with x = null and y the region bottom position on the y axis
   * @return {Object} {x,y}
   */
  getPointBottom: function(this: Region): { x: null; y?: number } {
    return { x: null, y: this.bottom };
  },

  /**
   * Returns a point that is the middle point of the region bottom segment
   * @return {Object} {x,y}
   */
  getPointBottomCenter: function(this: Region): { x?: number; y?: number } {
    return { x: this.left! + this.getWidth() / 2, y: this.bottom };
  },

  /**
   * Returns a point that is the bottom-left point of the region
   * @return {Object} {x,y}
   */
  getPointBottomLeft: function(this: Region): { x?: number; y?: number } {
    return { x: this.left, y: this.bottom };
  },

  /**
   * Returns a point that is the bottom-right point of the region
   * @return {Object} {x,y}
   */
  getPointBottomRight: function(this: Region): { x?: number; y?: number } {
    return { x: this.right, y: this.bottom };
  },

  /**
   * Returns a point with y = null and x the region left position on the x axis
   * @return {Object} {x,y}
   */
  getPointLeft: function(this: Region): { x?: number; y: null } {
    return { x: this.left, y: null };
  },

  /**
   * Returns a point that is the middle point of the region left segment
   * @return {Object} {x,y}
   */
  getPointLeftCenter: function(this: Region): { x?: number; y: number } {
    return { x: this.left, y: this.top + this.getHeight() / 2 };
  },

  /**
   * Returns a point with y = null and x the region right position on the x axis
   * @return {Object} {x,y}
   */
  getPointRight: function(this: Region): { x?: number; y: null } {
    return { x: this.right, y: null };
  },

  /**
   * Returns a point that is the middle point of the region right segment
   * @return {Object} {x,y}
   */
  getPointRightCenter: function(this: Region): { x?: number; y: number } {
    return { x: this.right, y: this.top + this.getHeight() / 2 };
  },

  /**
   * Returns a point that is the center of the region
   * @return {Object} {x,y}
   */
  getPointCenter: function(this: Region): { x: number; y: number } {
    return {
      x: this.left! + this.getWidth() / 2,
      y: this.top + this.getHeight() / 2,
    };
  },

  /**
   * @return {Number} returns the height of the region
   */
  getHeight: function(this: Region): number {
    return this.bottom! - this.top!;
  },

  /**
   * @return {Number} returns the width of the region
   */
  getWidth: function(this: Region): number {
    return this.right! - this.left!;
  },

  /**
   * @return {Number} returns the top property of the region
   */
  getTop: function(this: Region): number {
    return this.top;
  },

  /**
   * @return {Number} returns the left property of the region
   */
  getLeft: function(this: Region): number | undefined {
    return this.left;
  },

  /**
   * @return {Number} returns the bottom property of the region
   */
  getBottom: function(this: Region): number | undefined {
    return this.bottom;
  },

  /**
   * @return {Number} returns the right property of the region
   */
  getRight: function(this: Region): number | undefined {
    return this.right;
  },

  /**
   * Returns the area of the region
   * @return {Number} the computed area
   */
  getArea: function(this: Region): number {
    return this.getWidth() * this.getHeight();
  },

  constrainTo: function(this: Region, constrain: any) {
    var intersect = this.getIntersection(constrain);
    var shift: Position;

    if (!intersect || !intersect.equals(this)) {
      var constrainWidth = constrain.getWidth(),
        constrainHeight = constrain.getHeight();

      if (this.getWidth() > constrainWidth) {
        this.left = constrain.left;
        this.setWidth(constrainWidth);
      }

      if (this.getHeight() > constrainHeight) {
        this.top = constrain.top;
        this.setHeight(constrainHeight);
      }

      shift = {};

      if (this.right! > constrain.right) {
        shift.left = constrain.right - this.right!;
      }

      if (this.bottom! > constrain.bottom) {
        shift.top = constrain.bottom - this.bottom!;
      }

      if (this.left! < constrain.left) {
        shift.left = constrain.left - this.left!;
      }

      if (this.top < constrain.top) {
        shift.top = constrain.top - this.top;
      }

      this.shift(shift);

      return true;
    }

    return false;
  },

  __IS_REGION: true,
  /**
   * @property {Number} top
   */
  /**
   * @property {Number} right
   */
  /**
   * @property {Number} bottom
   */
  /**
   * @property {Number} left
   */
  /**
   * @property {Number} [0] the top property
   */
  /**
   * @property {Number} [1] the left property
   */
  /**
   * @method getIntersection
   * Returns a region that is the intersection of this region and the given region
   * @param  {Region} region The region to intersect with
   * @return {Region}        The intersection region
   */
  /**
   * @method getUnion
   * Returns a region that is the union of this region with the given region
   * @param  {Region} region  The region to make union with
   * @return {Region}        The union region. The smallest region that contains both this and the given region.
   */
});

Object.defineProperties(REGION.prototype, {
  width: {
    get: function() {
      return this.getWidth();
    },
    set: function(width) {
      return this.setWidth(width);
    },
  },
  height: {
    get: function() {
      return this.getHeight();
    },
    set: function(height) {
      return this.setHeight(height);
    },
  },
});

applyStatics(REGION);

export default REGION;
