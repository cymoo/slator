import React, { useCallback, useEffect, useRef, useState } from 'react'
import isUrl from 'is-url'
import { useSlate, useEditor, ReactEditor } from 'slate-react'
import { Transforms, Editor, Range } from 'slate'

import { Button, Icon, Portal } from './components'
import { css, cx } from 'emotion'
import { useClickAway } from './utils'
import { TooltipInput, Tooltip } from './components'

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

export const LinkButton = () => {
  const editor = useSlate()
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
  const editor = useEditor()
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState([0, 0])
  const ref = useClickAway(
    useCallback(() => {
      show && setShow(false)
    }, [show])
  )
  const tooltipRef = useRef()

  // 如果缺少{userSelect: 'none'}，则会抛异常，Uncaught Error: Cannot resolve a Slate node from DOM node: url
  // 参考某个issue
  return (
    <span
      {...attributes}
      ref={ref}
      onClick={(event) => {
        event.preventDefault()
        // TODO: 为什么使用以下的函数会出错
        // const el = ReactEditor.toDOMNode(editor, element)
        const el = ref.current
        const rect = el.getBoundingClientRect()
        setShow(true)
        setTimeout(() => {
          const tooltip = tooltipRef.current
          const left =
            rect.left +
            window.pageXOffset -
            tooltip.offsetWidth / 2 +
            rect.width / 2
          // const top = rect.top + window.pageYOffset + tooltip.offsetHeight
          const top = rect.top + window.pageYOffset
          setPosition([left, top])
        }, 0)
      }}
    >
      {show && (
        // 需要使用portal，否则会出错，见以下issue
        // https://github.com/ianstormtaylor/slate/issues/3421
        <Portal>
          <Tooltip
            ref={tooltipRef}
            width="auto"
            contentEditable={false}
            style={{
              left: position[0],
              top: position[1],
              height: 'auto',
            }}
          >
            <a
              href={element.url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'white',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '1em',
              }}
            >
              {element.url}
            </a>
          </Tooltip>
        </Portal>
      )}
      <a href={element.url}>{children}</a>
    </span>
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
