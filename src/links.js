import React, { useCallback, useEffect, useRef, useState } from 'react'
import isUrl from 'is-url'
import { useSlate, useEditor, ReactEditor } from 'slate-react'
import { Transforms, Editor, Range } from 'slate'

import { Button, Icon } from './components'
import { css, cx } from 'emotion'
import { useClickAway } from './utils'

// TODO: 双击某一个段落时，也会选中下一个段落的开头，这是BUG?
export const withLinks = (editor) => {
  const { insertData, insertText, isInline } = editor

  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element)
  }

  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertText(text)
    }
  }

  editor.insertData = (data) => {
    const text = data.getData('text/plain')

    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

export const LinkButton1 = () => {
  const editor = useSlate()
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={(event) => {
        event.preventDefault()
        if (isLinkActive(editor)) {
          unwrapLink(editor)
        } else {
          const url = window.prompt('Enter the URL of the link:')
          if (url) {
            insertLink(editor, url)
          }
        }
      }}
    >
      <Icon type="bi-link" />
    </Button>
  )
}
export const LinkButton = () => {
  // TODO: 搞清楚useSlate和useEditor的区别...
  const editor = useSlate()
  // const editor = useEditor()
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState([-10000, -10000])

  const ref = useClickAway(
    useCallback(() => {
      show && setShow(false)
    }, [show])
  )

  const selection = useRef(null)
  useEffect(() => {
    if (editor.selection) {
      selection.current = editor.selection
    }
  })

  return (
    <Button
      active={isLinkActive(editor)}
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setShow(false)
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        if (event.target.tagName.toLowerCase() === 'input') {
          return
        }
        if (isLinkActive(editor)) {
          unwrapLink(editor)
          return
        }

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
      <Icon type="link" />
      {show && (
        <TooltipInput
          top={position[0]}
          left={position[1]}
          onEnter={(url) => {
            setShow(false)
            if (url) {
              insertLink(editor, url, selection.current)
            }
          }}
        />
      )}
    </Button>
  )
}

export const LinkElement = ({ attributes, children, element }) => {
  const [show, setShow] = useState(false)
  const ref = useClickAway(
    useCallback(() => {
      show && setShow(false)
    }, [show])
  )

  return (
    <a
      {...attributes}
      href={element.url}
      ref={ref}
      onClick={(event) => {
        event.preventDefault()
        setShow(true)
      }}
      style={{ display: 'inline-block' }}
    >
      {show && (
        <Tooltip width="auto" contentEditable={false}>
          <span
            data-href={element.url}
            style={{
              color: 'white',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={(event) => {
              event.preventDefault()
            }}
          >
            {element.url}
          </span>
        </Tooltip>
      )}
      {children}
    </a>
  )
}

const insertLink = (editor, url, selection) => {
  if (selection) {
    wrapLink(editor, url, selection)
  }
}

const isLinkActive = (editor) => {
  const [link] = Editor.nodes(editor, { match: (n) => n.type === 'link' })
  return !!link
}

const unwrapLink = (editor) => {
  Transforms.unwrapNodes(editor, { match: (n) => n.type === 'link' })
}

const wrapLink = (editor, url, selection) => {
  // if (isLinkActive(editor)) {
  //   unwrapLink(editor)
  // }

  // const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, link, { at: selection })
  } else {
    Transforms.wrapNodes(editor, link, { split: true, at: selection })
    // TODO: 怎么选中该链接？
    // Transforms.collapse(editor, { edge: 'end' })
  }
}

// TEST
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
