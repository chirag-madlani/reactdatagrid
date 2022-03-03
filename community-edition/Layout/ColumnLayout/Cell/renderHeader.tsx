/**
 * Copyright © INOVUA TRADING.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

import join from '../../../packages/join';

import renderFilter from './renderFilter';
import ColumnResizer from './ColumnResizer';
import renderMenuTool from './renderMenuTool';
import Renderable from '../../../types/TypeRenderable';

const RESIZE_WRAPPER_CLASS_NAME =
  'InovuaReactDataGrid__column-header__resize-wrapper';
const HEADER_CONTENT_CLASS_NAME = 'InovuaReactDataGrid__column-header__content';

const EMPTY_OBJECT = {};

const renderContent = (props: any) => {
  if (!props) {
    return;
  }

  if (props.renderColumnReorderProxy) {
    return props.renderColumnReorderProxy(props);
  }

  return props.children;
};

const renderHeader = (
  props: any,
  domProps: any,
  cellInstance: any,
  state: any = EMPTY_OBJECT
): Renderable => {
  const dragging =
    props.dragging !== undefined ? props.dragging : state.dragging;
  const last =
    props.last || props.computedVisibleIndex == props.computedVisibleCount - 1;
  const {
    depth,
    showBorderRight,
    showBorderLeft,
    computedLocked,
    firstInSection,
    lastInSection,
    group,
    rtl,
    virtualizeColumns,
    headerProps,
  } = props;

  const style =
    headerProps && headerProps.headerCellStyle
      ? headerProps.headerCellStyle
      : null;

  let content: any = (
    <div
      key="content"
      style={style}
      className={`${HEADER_CONTENT_CLASS_NAME} ${
        props.headerEllipsis !== false
          ? 'InovuaReactDataGrid__box--ellipsis'
          : ''
      }`}
      children={renderContent(props)}
    />
  );

  const getHoverClassName = (props: any) => {
    const {
      computedEnableColumnHover,
      columnIndex,
      columnIndexHovered,
      columnHoverClassName,
    } = props;

    return computedEnableColumnHover && columnIndex === columnIndexHovered
      ? columnHoverClassName
        ? join(`${RESIZE_WRAPPER_CLASS_NAME}--over`, columnHoverClassName)
        : `${RESIZE_WRAPPER_CLASS_NAME}--over`
      : '';
  };

  const menuTool = renderMenuTool(props, cellInstance);
  const headerAlign =
    props.headerAlign != null ? props.headerAlign : props.textAlign;

  content = [
    headerAlign == 'end' && menuTool,
    content,
    headerAlign != 'end' && menuTool,
  ];

  if (props.computedResizable || props.computedFilterable) {
    let innerStyle = Object.assign({}, domProps.style || EMPTY_OBJECT);

    if (!dragging) {
      delete innerStyle.width;
      delete innerStyle.minWidth;
    }

    if (virtualizeColumns) {
      delete innerStyle.position;
    }

    let resizeHandleStyle;
    let right;
    let resizerClassName;

    if (props.computedResizable) {
      right =
        (props.computedVisibleIndex === props.computedVisibleCount - 1 &&
          !showBorderRight) ||
        lastInSection
          ? 0
          : -props.columnResizeHandleWidth / 2;
      resizeHandleStyle = {
        width: props.columnResizeHandleWidth,
        zIndex: 10000 * (depth || 0),
      };
      if (lastInSection && computedLocked === 'start') {
        right = -props.columnResizeHandleWidth + 1;
      }

      if (props.resizeProxyStyle) {
        resizeHandleStyle = Object.assign(
          {},
          props.resizeProxyStyle,
          resizeHandleStyle
        );
      }

      if (dragging) {
        delete innerStyle.top;
        if (rtl) {
          delete innerStyle.right;
        } else {
          delete innerStyle.left;
        }
      }

      resizerClassName = 'InovuaReactDataGrid__column-resizer';

      if (props.lastUnlocked && !props.last) {
        resizerClassName += ` ${resizerClassName}--last-unlocked`;
      }
      resizerClassName += ` InovuaReactDataGrid__column-resizer--direction-${
        rtl ? 'rtl' : 'ltr'
      }`;
    }

    if (innerStyle.transform) {
      // there is a test making sure this is still here and
      // that the transform is not leaked to the inner wrapper
      delete innerStyle.transform;
    }

    let theStyle = props.style;
    let styleCloned = false;

    if (computedLocked) {
      theStyle = {
        ...theStyle,
      };
      styleCloned = true;
    }

    let resizeHandle;

    if (!dragging && virtualizeColumns) {
      theStyle.left = props.left;
      theStyle.position = 'absolute';
    }

    if (props.computedResizable) {
      resizeHandle = (
        <ColumnResizer
          key="columnResizer"
          className={resizerClassName}
          onMouseDown={props.onResizeMouseDown}
          onTouchStart={props.onResizeTouchStart}
          style={{
            width: props.columnResizeHandleWidth,
            [props.rtl ? 'left' : 'right']: right,
            zIndex:
              (depth || 0) * 10000 + (100 - props.computedVisibleIndex || 0),
          }}
          resizeHandleStyle={resizeHandleStyle}
          resizeHandleClassName="InovuaReactDataGrid__column-resize-handle"
        />
      );
    } else {
      if (dragging && props.computedFilterable) {
        if (!styleCloned) {
          styleCloned = true;
          theStyle = { ...theStyle };
        }
        if (rtl) {
          theStyle.right = state.right || 0;
        } else {
          theStyle.left = state.left || 0;
        }
        theStyle.top = state.top || 0;
      }
    }

    const hoverClassName = getHoverClassName(props);

    const onMouseEnter = domProps.onMouseEnter;
    const onMouseLeave = domProps.onMouseLeave;

    delete domProps.onMouseEnter;
    delete domProps.onMouseLeave;

    return (
      <div
        ref={domProps.ref}
        style={theStyle}
        onFocus={domProps.onFocus}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={join(
          RESIZE_WRAPPER_CLASS_NAME,
          dragging && `${RESIZE_WRAPPER_CLASS_NAME}--dragging`,
          group
            ? `${RESIZE_WRAPPER_CLASS_NAME}--has-group`
            : `${RESIZE_WRAPPER_CLASS_NAME}--has-no-group`,
          showBorderLeft &&
            `${RESIZE_WRAPPER_CLASS_NAME}--show-border-${
              rtl ? 'right' : 'left'
            }`,
          (showBorderRight ||
            (props.computedShowHeaderBorderRight && last && !firstInSection)) &&
            `${RESIZE_WRAPPER_CLASS_NAME}--show-border-${
              rtl ? 'left' : 'right'
            }`,
          `${RESIZE_WRAPPER_CLASS_NAME}--direction-${rtl ? 'rtl' : 'ltr'}`,
          computedLocked && `${RESIZE_WRAPPER_CLASS_NAME}--locked`,
          computedLocked &&
            `${RESIZE_WRAPPER_CLASS_NAME}--locked-${computedLocked}`,
          firstInSection && `${RESIZE_WRAPPER_CLASS_NAME}--first-in-section`,
          lastInSection && `${RESIZE_WRAPPER_CLASS_NAME}--last-in-section`,
          last && `${RESIZE_WRAPPER_CLASS_NAME}--last`,
          props.headerWrapperClassName,
          hoverClassName
        )}
      >
        <div {...cleanup(domProps)} style={innerStyle} children={content} />
        {resizeHandle}
        {props.computedFilterable && !dragging
          ? renderFilter(props, cellInstance)
          : null}
      </div>
    );
  }

  const ref = domProps.ref;
  const className = getHoverClassName(props);

  return (
    <div
      {...cleanup(domProps)}
      className={className}
      ref={ref}
      id={null}
      name={null}
      title={null}
      type={null}
      value={null}
      children={content}
    />
  );
};

const cleanup = (domProps: any) => {
  delete domProps.ref;
  delete domProps.id;
  delete domProps.computedOffset;
  delete domProps.name;
  delete domProps.title;
  delete domProps.type;
  delete domProps.value;
  delete domProps.onFocus;

  return domProps;
};
export default renderHeader;
