import React, { useCallback, useMemo, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import isHotkey from 'is-hotkey'
import HotKeys from './hotkeys'
import {
  Editable,
  withReact,
  ReactEditor,
  useSlate,
  Slate,
  useReadOnly,
} from 'slate-react'
import { Editor, Transforms, createEditor, Range } from 'slate'
import { withHistory } from 'slate-history'

import { Button, Icon, Toolbar, Tooltip, TooltipInput } from './components'
import { withMarkdownShortcuts } from './markdown'
import { withPasteHtml } from './paste-html'
import { withCodeBlock, toggleCodeBlock, CodeBlock } from './code'
import { withLinks, LinkButton, LinkElement } from './link'
import {
  withImages,
  ImageButton,
  ImageElement,
  ImageElementReadOnly,
} from './image'
import { ColorButton } from './color'
import { withDivider, DividerButton, DividerElement } from './divider'
import { withCheckList, CheckListButton, CheckListElement } from './checklist'
import { assignIfNotUndefined, imageValidator } from './utils'
import './style.css'
import 'animate.css/animate.css'

import _ from 'lodash'

window._ = _

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const LIST_TYPES = ['numbered-list', 'bulleted-list']

const Slator = (props) => {
  const {
    value,
    onChange,
    readOnly,
    markdown,
    pastHTML,
    imageUploadRequest,
    onImageUploadSuccess,
    onImageUploadError,
    maxImageSize,
    onImageExceedMaxSize,
    allowedImageTypes,
    onInvalidImageTypes,
  } = props

  assignIfNotUndefined(imageValidator, {
    maxImageSize,
    onImageExceedMaxSize,
    allowedImageTypes,
    onInvalidImageTypes,
  })

  const renderElement = useCallback(
    (props) => (
      <Element
        {...props}
        imageUploadRequest={imageUploadRequest}
        onImageUploadSuccess={onImageUploadSuccess}
        onImageUploadError={onImageUploadError}
      />
    ),
    [imageUploadRequest, onImageUploadSuccess, onImageUploadSuccess]
  )
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])
  const editor = useMemo(
    () =>
      withHistory(
        withPasteHtml(
          withMarkdownShortcuts(
            // TODO: 好像没必须要withCheckList
            withCheckList(
              withDivider(
                withImages(withLinks(withCodeBlock(withReact(createEditor()))))
              )
            )
          )
        )
      ),
    []
  )

  // NOTE: remove it later
  window.editor = editor

  const [showLinkPreview, setShowLinkPreview] = useState(false)
  const [linkPreviewPosition, setLinkPreviewPosition] = useState([
    -10000,
    -10000,
  ])
  const [linkPreviewURL, setLinkPreviewURL] = useState('')
  const linkPreviewTooltip = useRef()

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        // console.log(editor.selection)
        // setValue(value)
        onChange(value)
      }}
    >
      <Toolbar
        style={{ display: 'flex', alignItems: 'center' }}
        className="toolbar"
      >
        <MarkButton format="bold" icon="bold" />
        <MarkButton format="italic" icon="italic" />
        <MarkButton format="underline" icon="underline" />
        <MarkButton format="strikethrough" icon="strikethrough" />
        <BlockButton
          format="code-block"
          icon="code-slash"
          style={{ fontSize: '125%' }}
        />
        <BlockButton format="block-quote" icon="quotes-right" />
        {/* <BlockButton format="heading-one" icon="header" />*/}

        <BlockButton format="heading-one" icon="font-size" />
        <BlockButton
          format="heading-two"
          icon="font-size"
          style={{ fontSize: '80%' }}
        />

        {/* <BlockButton format="heading-one" icon="header1" />*/}
        {/* <BlockButton format="heading-two" icon="header2" />*/}
        {/* <BlockButton format="heading-three" icon="header3" />*/}

        <BlockButton format="numbered-list" icon="list-numbered" />
        <BlockButton format="bulleted-list" icon="list-bulleted" />
        <CheckListButton />
        <LinkButton />
        <ImageButton />

        <ColorButton format="color" />
        <ColorButton format="background" />

        <AlignButton format="left" icon="paragraph-left" />
        <AlignButton format="right" icon="paragraph-right" />
        <AlignButton format="justify" icon="paragraph-justify" />
        <AlignButton format="center" icon="paragraph-center" />

        <IndentButton format="indent" icon="indent-increase" />
        <IndentButton format="unindent" icon="indent-decrease" />

        <MarkButton format="sup" icon="superscript" />
        <MarkButton format="sub" icon="subscript" />

        <DividerButton />

        <Button
          onMouseDown={(event) => {
            event.preventDefault()
            editor.undo()
            // console.log(editor.operations)
          }}
        >
          <Icon type="undo" />
        </Button>
        <Button>
          <Icon
            type="redo"
            onMouseDown={(event) => {
              event.preventDefault()
              editor.redo()
              // console.log(editor.operations)
            }}
          />
        </Button>
      </Toolbar>
      <Editable
        className="editor"
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder="找到她..."
        spellCheck
        readOnly={readOnly}
        autoFocus
        onKeyDown={(event) => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault()
              const mark = HOTKEYS[hotkey]
              toggleMark(editor, mark)
            }
          }
          // console.log(event.key)
          // if (HotKeys.isUndo(event)) {
          //   console.log('undo...')
          //   console.log(editor.operations)
          // }
          // if (HotKeys.isRedo(event)) {
          //   console.log('redo...')
          //   console.log(editor.operations)
          // }
        }}
        // https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer/setData
        onDrop={(event) => {
          const imgId = event.dataTransfer.getData('image-id')
          if (!imgId) {
            return
          }

          const [match] = Editor.nodes(editor, {
            match: (node) => node.type === 'image' && node.id === imgId,
            at: [],
          })
          if (match) {
            const range = ReactEditor.findEventRange(editor, event)
            // NOTE: 不能使用moveNodes, to只能为path，得先删除再插入
            // Transforms.moveNodes(editor, { at: match[1], to: range.anchor })
            Transforms.select(editor, range.anchor)
            Transforms.removeNodes(editor, { at: match[1] })
            Transforms.insertNodes(editor, match[0], { at: editor.selection })

            // TODO: a better way to keep the cursor unchanged?
            setTimeout(() => {
              const [match] = Editor.nodes(editor, {
                match: (node) => node.type === 'image' && node.id === imgId,
                at: [],
              })
              if (match) {
                Transforms.select(editor, match[1])
                Transforms.move(editor, { reverse: true })
              }
            })
            event.preventDefault()
          }
        }}
        // TODO: onMouseDown或click触发时，window.getSelection() or editor.selection为上一次的selection?!
        onMouseUp={(event) => {
          const selection = editor.selection
          if (selection && Range.isCollapsed(selection)) {
            const [match] = Editor.nodes(editor, {
              match: (node) => node.type === 'link',
            })
            if (match) {
              event.preventDefault()
              const range = Editor.range(editor, match[1])
              const domRange = ReactEditor.toDOMRange(editor, range)
              const rect = domRange.getBoundingClientRect()
              const top = rect.top + window.pageYOffset - 13
              const left = rect.left + window.pageXOffset - rect.width / 2

              setShowLinkPreview(true)
              setLinkPreviewURL(match[0].url)
              setLinkPreviewPosition([top, left])
            } else {
              setShowLinkPreview(false)
              setLinkPreviewURL('')
              setLinkPreviewPosition([-10000, -10000])
            }
          }
        }}
        style={{ minHeight: 300 }}
      />
      {showLinkPreview && (
        <Tooltip
          width="auto"
          ref={linkPreviewTooltip}
          className="tooltip"
          style={{
            top: linkPreviewPosition[0],
            left: linkPreviewPosition[1],
          }}
        >
          <a
            href={linkPreviewURL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 14,
              color: 'white',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {linkPreviewURL}
          </a>
        </Tooltip>
      )}
    </Slate>
  )
}

Slator.defaultProps = {
  readOnly: false,
  markdown: true,
  pasteHtml: true,
  imageRetryDelay: 3,
  imageRetryCount: 5,
  allowedImageTypes: ['png', 'jpg', 'jpeg', 'gif'],
  maxImageSize: 1024 * 1024 * 5,
}

const toggleBlock = (editor, format) => {
  if (format === 'code-block') {
    toggleCodeBlock(editor)
    return
  }
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: (n) => LIST_TYPES.includes(n.type),
    split: true,
  })

  Transforms.setNodes(editor, {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  })

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const isBlockActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => n.type === format,
  })

  return !!match
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const Element = (props) => {
  const readOnly = useReadOnly()
  const { attributes, children, element } = props
  const { align, indent } = element
  const style = {}
  if (align) {
    style.textAlign = align
  }
  if (indent) {
    style.textIndent = `${indent}em`
  }

  switch (element.type) {
    case 'image':
      return readOnly ? (
        <ImageElementReadOnly {...props} />
      ) : (
        <ImageElement {...props} />
      )
    case 'link':
      return <LinkElement {...props} />
    case 'check-list':
      return <CheckListElement {...props} />
    case 'divider':
      return <DividerElement {...props} />
    case 'code-block':
      return (
        <CodeBlock attributes={attributes} style={style}>
          {children}
        </CodeBlock>
      )
    case 'block-quote':
      return (
        <blockquote {...attributes} style={style}>
          {children}
        </blockquote>
      )
    case 'heading-one':
      return (
        <h1 {...attributes} style={style}>
          {children}
        </h1>
      )
    case 'heading-two':
      return (
        <h2 {...attributes} style={style}>
          {children}
        </h2>
      )
    case 'heading-three':
      return (
        <h3 {...attributes} style={style}>
          {children}
        </h3>
      )
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>
    case 'list-item':
      return (
        <li {...attributes} style={style}>
          {children}
        </li>
      )
    default:
      return (
        <p {...attributes} style={style}>
          {children}
        </p>
      )
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.color || leaf.background) {
    children = (
      <span
        style={{
          color: leaf.color || 'inherit',
          backgroundColor: leaf.background || 'inherit',
        }}
      >
        {children}
      </span>
    )
  }

  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  if (leaf.strikethrough) {
    children = <del>{children}</del>
  }

  if (leaf.sup) {
    children = <sup>{children}</sup>
  }

  if (leaf.sub) {
    children = <sub>{children}</sub>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  return <span {...attributes}>{children}</span>
}

const BlockButton = ({ format, icon, ...rest }) => {
  const editor = useSlate()
  const isActive = isBlockActive(editor, format)
  return (
    <Button
      title={format}
      active={isActive}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
      {...rest}
    >
      <Icon type={icon} color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

const MarkButton = ({ format, icon, ...rest }) => {
  const editor = useSlate()
  const isActive = isMarkActive(editor, format)
  return (
    <Button
      active={isActive}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
      {...rest}
    >
      <Icon type={icon} color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

const toggleAlign = (editor, format) => {
  const isActive = isAlignActive(editor, format)
  Transforms.setNodes(
    editor,
    { align: isActive ? null : format },
    { match: (node) => Editor.isBlock(editor, node) }
  )
}

const isAlignActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => n.align === format && Editor.isBlock(editor, n),
  })

  return !!match
}

const AlignButton = ({ format, icon }) => {
  const editor = useSlate()
  const isActive = isAlignActive(editor, format)
  return (
    <Button
      active={isActive}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleAlign(editor, format)
      }}
    >
      <Icon type={icon} color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

const indentBlock = (editor, format) => {
  for (const [node, path] of Editor.nodes(editor, {
    match: (node) => Editor.isBlock(editor, node),
  })) {
    let indent = node.indent || 0
    if (format === 'indent') {
      ++indent
    } else if (format === 'unindent') {
      indent = Math.max(--indent, 0)
    } else {
      // impossible
      throw new Error(`wrong indent type: ${format}`)
    }
    Transforms.setNodes(editor, { indent }, { at: path })
  }
}

const IndentButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      onMouseDown={(event) => {
        event.preventDefault()
        indentBlock(editor, format)
      }}
    >
      <Icon type={icon} />
    </Button>
  )
}

export default Slator
export { imageValidator }
