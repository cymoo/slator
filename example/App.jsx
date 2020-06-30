import React, { useState, useRef, useEffect, useCallback } from 'react'
import { css, cx } from 'emotion'
import Slator from '../src/slator'
import { useClickAway } from '../src/utils'
import QuillEditor from './QuillEditor'
// import './index.css'

class ErrorCatcher extends React.Component {
  componentDidCatch(error, errorInfo) {
    alert(error)
  }

  render() {
    return this.props.children
  }
}

const App = () => {
  const [value, setValue] = useState(initialValue)
  return (
    <div
      className={css`
        position: relative;
        margin-top: 30px;
        margin-left: auto;
        margin-right: auto;
        max-width: 1000px;
      `}
    >
      <ErrorCatcher>
        <Slator
          // readOnly
          value={value}
          onChange={(value) => setValue(value)}
          imageUploadRequest={() => {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                if (Math.random() > 0.3) {
                  reject('timeout')
                } else {
                  resolve({
                    url:
                      'https://cn.bing.com/th?id=OHR.GorchFock_EN-CN2672694129_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4&r=0',
                  })
                }
              }, 3000)
            })
          }}
          onImageUploadSuccess={() => {
            // console.log('image has been upload to server')
          }}
          onImageUploadError={() => {
            // console.log('image upload error')
          }}
          allowedImageTypes="png gif"
          onInvalidImageTypes={() => alert('wrong image type')}
        />
      </ErrorCatcher>
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

const initialValue = [
  { type: 'heading-one', children: [{ text: 'hello rich editor' }] },
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'rich', bold: true },
      // { text: ' text, ' },
      { type: 'link', url: 'http://bing.com', children: [{ text: ' text, ' }] },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
  },
  {
    type: 'heading-two',
    children: [{ text: 'finding her is the most important thing' }],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: 'bold', bold: true },
      {
        text:
          ', or add a semantically rendered block quote in the middle of the page, like this:',
      },
    ],
  },
  {
    type: 'image',
    alt: '一定要去这个地方',
    id: '123',
    url:
      'https://cn.bing.com/th?id=OHR.RhodesIsland_EN-CN2167254194_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4&r=0',
    children: [{ text: '' }],
  },
  {
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'code-block',
    children: [{ text: 'def foo():\n    print("hello world")\n' }],
  },
  {
    type: 'check-list',
    checked: false,
    children: [{ text: 'Learn AI' }],
  },
  {
    type: 'check-list',
    checked: true,
    children: [{ text: 'Learn React and web' }],
  },
  {
    type: 'check-list',
    checked: false,
    children: [{ text: 'Learn compiler technique' }],
  },
  { type: 'paragraph', children: [{ text: 'Keep calm and carry on!' }] },
]

export default App
