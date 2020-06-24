import React, { useState, useRef, useEffect, useCallback } from 'react'
import { css, cx } from 'emotion'
import Slator from '../src/slator'
import { useClickAway } from '../src/utils'
import QuillEditor from './QuillEditor'
// import './index.css'

const App = () => {
  return (
    <div
      className={css`
        margin-top: 30px;
        margin-left: auto;
        margin-right: auto;
        max-width: 1000px;
      `}
    >
      <Slator />
      {/* <hr />*/}
      {/* <QuillEditor*/}
      {/*  onChange={(value) => {*/}
      {/*    // console.log(value)*/}
      {/*  }}*/}
      {/*  imageUploadRequest={() => {*/}
      {/*    return new Promise((resolve) => {*/}
      {/*      setTimeout(() => {*/}
      {/*        resolve({*/}
      {/*          url:*/}
      {/*            'https://www.bing.com/th?id=OHR.StStephens_ZH-CN9373191410_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=HpEdgeAn',*/}
      {/*        })*/}
      {/*      }, 5000)*/}
      {/*    })*/}
      {/*  }}*/}
      {/* />*/}
      {/* <hr />*/}
      {/* <QuillEditor*/}
      {/*  theme="bubble"*/}
      {/*  className="editor"*/}
      {/*  onChange={(value) => {*/}
      {/*    // console.log(value)*/}
      {/*  }}*/}
      {/*  imageUploadRequest={() => Promise.resolve({ url: '' })}*/}
      {/* />*/}
    </div>
  )
}

const Button = () => {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState([-10000, -10000])

  const handleClickAway = useCallback(() => setShow(false), [])
  const ref = useClickAway(handleClickAway)

  return (
    <div>
      <button
        style={{ position: 'relative' }}
        ref={ref}
        onClick={() => {
          if (!show) {
            const el = ref.current
            const rect = el.getBoundingClientRect()
            const top = rect.height
            const left = rect.width / 2 - 102
            setPosition([top, left])
          }
          setShow((show) => !show)
        }}
      >
        click me
        {show && (
          <TooltipInput
            top={position[0]}
            left={position[1]}
            // style={show ? {} : { display: 'none' }}
            onEnter={(value) => {
              setShow(false)
              // eslint-disable-next-line no-console
              console.log(value)
            }}
          />
        )}
      </button>
    </div>
  )
}

const Tooltip = (props) => {
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
  let style
  if (arrow === 'top') {
    style = css`
      border-bottom: 6px solid #444;
      top: -6px;
    `
  } else {
    style = css`
      border-top: 6px solid #444;
      top: -6px;
    `
  }

  return (
    <div
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
          width: ${width}px;
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
          style,
          css`
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
}

Tooltip.defaultProps = {
  width: 204,
  height: 40,
  arrow: 'top',
}

const TooltipInput = (props) => {
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
          font-size: 13px;
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

export default App
