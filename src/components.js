import React from 'react'
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
  let { className, type, height, width, color, ...rest } = props

  if (type === 'code-slash') {
    height = 18
    width = 18
  }

  return (
    <svg width={width} height={height} fill={color} {...rest}>
      <use xlinkHref={`${icons}#${type}`} />
    </svg>
  )
})

Icon.defaultProps = {
  height: 16,
  width: 16,
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
        }

        & > * + * {
          margin-left: 20px;
        }
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
      className,
      css`
        position: relative;
        padding: 1px 18px 17px;
        margin: 0 -20px;
        border-bottom: 2px solid #eee;
        margin-bottom: 20px;
      `
    )}
  />
))
