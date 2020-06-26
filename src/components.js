import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { cx, css } from 'emotion'
import icons from './icons.svg'
// import MDIcon from '@mdi/react'
// import {
//   mdiFormatBold,
//   mdiFormatItalic,
//   mdiFormatUnderline,
//   mdiCodeBraces,
//   mdiFormatHeader1,
//   mdiFormatHeader2,
//   mdiFormatQuoteOpen,
//   mdiFormatListNumbered,
//   mdiFormatListBulleted,
//   mdiImage,
//   mdiLink,
// } from '@mdi/js'

// const icons = {
//   'format-bold': mdiFormatBold,
//   'format-italic': mdiFormatItalic,
//   'format-underlined': mdiFormatUnderline,
//   code: mdiCodeBraces,
//   'format-header1': mdiFormatHeader1,
//   'format-header2': mdiFormatHeader2,
//   'format-quote': mdiFormatQuoteOpen,
//   'format-list-numbered': mdiFormatListNumbered,
//   'format-list-bulleted': mdiFormatListBulleted,
//   image: mdiImage,
//   link: mdiLink,
// }

export const Button = React.forwardRef(
  ({ className, active, reversed, ...props }, ref) => (
    <span
      {...props}
      ref={ref}
      className={cx(
        className,
        css`
          position: relative;
          cursor: pointer;
          color: ${reversed
            ? active
              ? 'white'
              : '#aaa'
            : active
            ? '#333'
            : '#6a6f7b'};
          transition: all 0.2s ease-in;
        `
      )}
    />
  )
)

export const EditorValue = React.forwardRef(
  ({ className, value, ...props }, ref) => {
    const textLines = value.document.nodes
      .map((node) => node.text)
      .toArray()
      .join('\n')
    return (
      <div
        ref={ref}
        {...props}
        className={cx(
          className,
          css`
            margin: 30px -20px 0;
          `
        )}
      >
        <div
          className={css`
            font-size: 14px;
            padding: 5px 20px;
            color: #404040;
            border-top: 2px solid #eeeeee;
            background: #f8f8f8;
          `}
        >
          Slate's value as text
        </div>
        <div
          className={css`
            color: #404040;
            font: 12px monospace;
            white-space: pre-wrap;
            padding: 10px 20px;
            div {
              margin: 0 0 0.5em;
            }
          `}
        >
          {textLines}
        </div>
      </div>
    )
  }
)

// export const Icon = React.forwardRef(({ className, ...props }, ref) => (
//   <span
//     {...props}
//     ref={ref}
//     className={cx(
//       'material-icons',
//       className,
//       css`
//         font-size: 18px;
//         vertical-align: text-bottom;
//       `
//     )}
//   />
// ))

export const Icon = React.forwardRef((props, ref) => {
  const { className, type, color, ...rest } = props

  return (
    <svg
      className={cx('icon', className)}
      // width={width}
      // height={height}
      fill={color}
      {...rest}
    >
      <use xlinkHref={`${icons}#${type}`} />
    </svg>
  )
})

Icon.defaultProps = {
  // height: 16,
  // width: 16,
  color: '#6a6f7b',
}

export const Instruction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    className={cx(
      className,
      css`
        white-space: pre-wrap;
        margin: 0 -20px 10px;
        padding: 10px 20px;
        font-size: 14px;
        background: #f8f8e8;
      `
    )}
  />
))

export const Menu = React.forwardRef(({ className, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    className={cx(
      className,
      css`
        & > * {
          display: inline-block;
          padding-left: 10px;
          padding-right: 10px;
        }

        // & > * + * {
        //   padding-left: 20px;
        // }
      `
    )}
  />
))

export const Portal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body)
}

export const Toolbar = React.forwardRef(({ className, ...props }, ref) => (
  <Menu
    {...props}
    ref={ref}
    className={cx(
      // 'shadow-v3',
      className,
      css`
        position: relative;
        padding: 1px 18px 17px;
        margin: 0 -20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.09);
        margin-bottom: 20px;
      `
    )}
  />
))

// TEST
export const Tooltip = React.forwardRef((props, ref) => {
  const {
    width,
    height,
    arrow,
    children,
    className,
    left,
    top,
    ...rest
  } = props
  // let style
  // if (arrow === 'top') {
  //   style = css`
  //     border-bottom: 6px solid #444;
  //     top: -6px;
  //   `
  // } else {
  //   style = css`
  //     border-top: 6px solid #444;
  //     top: -6px;
  //   `
  // }

  return (
    <div
      ref={ref}
      className={cx(
        className,
        css`
          position: absolute;
          display: flex;
          align-items: center;
          padding: 8px 12px;
          transform: translateY(10px);
          left: ${left}px;
          top: ${top}px;
          width: ${typeof width === 'string' ? width : `${width}px`};
          height: ${height}px;
          background-color: #444;
          border-radius: 25px;
          color: #fff;
        `
      )}
      onClick={(event) => {
        event.stopPropagation()
      }}
      {...rest}
    >
      <span
        className={cx(
          css`
            border-bottom: 6px solid #444;
            top: -6px;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            content: ' ';
            display: block;
            left: 50%;
            margin-left: -6px;
            position: absolute;
          `
        )}
      />
      {children}
    </div>
  )
})

Tooltip.defaultProps = {
  width: 204,
  height: 40,
  left: -10000,
  top: -10000,
  arrow: 'top',
}

export const TooltipInput = (props) => {
  const [value, setValue] = useState('')
  const { placeholder, onEnter, ...rest } = props
  const ref = useRef()

  useEffect(() => {
    ref.current.focus()
  })

  return (
    <Tooltip {...rest}>
      <input
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onEnter(value)
          }
        }}
        type="text"
        placeholder={placeholder}
        className={css`
          width: 100%;
          font-size: 14px;
          border: none;
          background: transparent;
          outline: none;
          color: #fff;
        `}
      />
    </Tooltip>
  )
}

TooltipInput.defaultProps = {
  placeholder: '链接地址',
}
