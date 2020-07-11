import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
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
import {
  Editor,
  Transforms,
  createEditor,
  Range,
  Path,
  Node,
  Point,
  // Element,
} from 'slate'
import { withHistory, HistoryEditor } from 'slate-history'

import { Button, Icon, Menu, Portal, Tooltip, TooltipInput } from './components'
import { withMarkdownShortcuts } from './markdown'
import { withPasteHtml } from './paste-html'
import { withCodeBlock, toggleCodeBlock, CodeBlock } from './code'
import { withLinks, LinkButton, LinkElement } from './link'
import {
  withImages,
  ImageButton,
  ImageElement,
  ImageElementReadOnly,
  selectImage,
} from './image'
import { ColorButton } from './color'
import { withDivider, DividerButton, DividerElement } from './divider'
import { CheckListButton, CheckListElement } from './checklist'
import {
  assignIfNotUndefined,
  imageValidator,
  compose,
  useClickAway,
} from './utils'
import './style.css'
import 'animate.css/animate.css'

import _ from 'lodash'
import { css, cx } from 'emotion'

window._ = _

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const LIST_TYPES = ['numbered-list', 'bulleted-list']

const prevChar = (editor, selection) => {
  if (selection === undefined) selection = editor.selection
  const prevPoint = Editor.before(editor, selection)
  return Editor.string(editor, { anchor: prevPoint, focus: selection.anchor })
}

const nextChar = (editor, selection) => {
  if (selection === undefined) selection = editor.selection
  const nextPoint = Editor.after(editor, selection)
  return Editor.string(editor, { anchor: selection.focus, focus: nextPoint })
}

const withBetterTypingExperience = (editor) => {
  const { insertBreak, insertText, deleteBackward } = editor

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: (node) =>
        ['heading-one', 'heading-two', 'heading-three', 'block-quote'].includes(
          node.type
        ),
    })
    if (match) {
      Editor.insertNode(editor, { type: 'paragraph', children: [{ text: '' }] })
    } else {
      insertBreak()
    }
  }

  editor.insertText = (text) => {
    const pc = prevChar(editor)
    insertText(text)

    if ('[({<'.includes(text)) {
      if (text === '[') Editor.insertText(editor, ']')
      if (text === '(') Editor.insertText(editor, ')')
      if (text === '{') Editor.insertText(editor, '}')
      if (text === '<') Editor.insertText(editor, '>')
      Transforms.move(editor, { reverse: true })
    }
    if (text === '"' && pc !== '"') {
      Editor.insertText(editor, '"')
      Transforms.move(editor, { reverse: true })
    }
    if (text === "'" && pc !== "'") {
      Editor.insertText(editor, "'")
      Transforms.move(editor, { reverse: true })
    }
  }

  // TODO: 删除多重嵌套的元素时（当黏贴HTML时才会出现），需要做额外的处理
  editor.deleteBackward = (...args) => {
    const { selection } = editor

    // reset to paragraph
    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n) && !Editor.isVoid(editor, n),
      })

      if (match) {
        const [block, path] = match
        const start = Editor.start(editor, path)

        if (
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          Transforms.setNodes(editor, { type: 'paragraph' }) // need match?

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: (n) =>
                n.type === 'bulleted-list' || n.type === 'numbered-list',
              split: true,
            })
          }
          return
        }
      }
    }

    // just for user experience
    if (selection && Range.isCollapsed(selection)) {
      const pc = prevChar(editor)
      const nc = nextChar(editor)
      if (
        (pc === '[' && nc === ']') ||
        (pc === '(' && nc === ')') ||
        (pc === '{' && nc === '}') ||
        (pc === '<' && nc === '>') ||
        (pc === '"' && nc === '"') ||
        (pc === "'" && nc === "'")
      ) {
        Editor.deleteForward(editor, { unit: 'character' })
      }
    }

    deleteBackward(...args)
  }

  return editor
}

const Slator = (props) => {
  const {
    value,
    onChange,
    readOnly,
    placeholder,
    spellCheck,
    autoFocus,
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
      compose(
        withHistory,
        withPasteHtml,
        withBetterTypingExperience,
        withMarkdownShortcuts,
        // TODO: 好像没必须要withCheckList
        // withCheckList,
        withDivider,
        withImages,
        withLinks,
        withCodeBlock,
        withReact,
        createEditor
      )(),
    []
  )

  // NOTE: remove it later
  window.editor = editor

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        HistoryEditor.withoutSaving(editor, () =>
          fixChromeDoubleClickBug(editor)
        )
        onChange(value)
      }}
    >
      <Toolbar />
      <FloatingToolBar />
      <AddMediaButton />
      <Editable
        className="editor"
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={placeholder}
        spellCheck={spellCheck}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onKeyDown={(event) => {
          // fixChromeDoubleClickBug(editor)

          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault()
              const mark = HOTKEYS[hotkey]
              toggleMark(editor, mark)
            }
          }
        }}
        // https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer/setData
        onDrop={(event) => {
          if (readOnly) {
            return
          }

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
        // onMouseUp={(event) => {
        // //
        // }}
        // TODO: 为什么点击选取却无法取消选取？？
        // onSelect={(event) => {
        //   const domSelection = window.getSelection()
        //   if (ReactEditor.isFocused(editor) && domSelection) {
        //     const domRange = domSelection.getRangeAt(0)
        //     if (!domSelection.isCollapsed) {
        //       const rect = domRange.getBoundingClientRect()
        //       const el = floatingRef.current
        //       const top = rect.top + window.pageYOffset - el.offsetHeight - 30
        //       // const top = rect.top + window.pageYOffset - el.offsetHeight
        //       const left =
        //         rect.left +
        //         window.pageXOffset -
        //         el.offsetWidth / 2 +
        //         rect.width / 2
        //       setFloatingPosition([left, top])
        //     } else {
        //       setFloatingPosition([-10000, -10000])
        //     }
        //   }
        // }}
        style={{ minHeight: 300 }}
      />
    </Slate>
  )
}

Slator.defaultProps = {
  readOnly: false,
  placeholder: 'how can we live without a story to tell',
  spellCheck: true,
  autoFocus: true,
  markdown: true,
  pasteHtml: true,
  imageRetryDelay: 3,
  imageRetryCount: 5,
  allowedImageTypes: ['png', 'jpg', 'jpeg', 'gif'],
  maxImageSize: 1024 * 1024 * 5,
}

const Toolbar = (props) => {
  const editor = useSlate()

  return (
    <Menu style={{ display: 'flex', alignItems: 'center' }} className="toolbar">
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
      <MarkButton icon="file" />

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
          const marks = Editor.marks(editor)
          for (const key in marks) {
            Editor.removeMark(editor, key)
          }
        }}
      >
        <Icon type="eraser" />
      </Button>

      <Button
        onMouseDown={(event) => {
          event.preventDefault()
          editor.undo()
          // console.log(editor.operations)
        }}
      >
        <Icon type="undo" />
      </Button>
      <Button
        onMouseDown={(event) => {
          event.preventDefault()
          editor.redo()
          // console.log(editor.operations)
        }}
      >
        <Icon type="redo" />
      </Button>
    </Menu>
  )
}

const FloatingToolBar = (props) => {
  const ref = useRef(null)
  const editor = useSlate()

  useEffect(() => {
    const el = ref.current
    const { selection } = editor

    if (!el) {
      return
    }

    if (
      !selection ||
      !ReactEditor.isFocused(editor) ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      el.removeAttribute('style')
      return
    }

    const domSelection = window.getSelection()
    const domRange = domSelection.getRangeAt(0)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = 0.95
    // TODO: 处理上下左右四个边界溢出的问题
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight - 50}px`
    const left =
      rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
    el.style.left = `${Math.max(left, 15)}px`
  })

  return (
    <Portal>
      <Menu ref={ref} className="floating-toolbar">
        <MarkButton format="bold" icon="bold" />
        <MarkButton format="italic" icon="italic" />
        {/*<MarkButton format="underline" icon="underline" />*/}
        {/*<MarkButton format="strikethrough" icon="strikethrough" />*/}

        <BlockButton format="block-quote" icon="quotes-right" />
        <BlockButton
          format="code-block"
          icon="code-slash"
          style={{ fontSize: '125%' }}
        />

        <BlockButton format="heading-one" icon="font-size" />
        <BlockButton
          format="heading-two"
          icon="font-size"
          style={{ fontSize: '80%' }}
        />

        <BlockButton format="numbered-list" icon="list-numbered" />
        <BlockButton format="bulleted-list" icon="list-bulleted" />
        <CheckListButton />
        <LinkButton />
      </Menu>
    </Portal>
  )
}

// TEST
const AddMediaButton = (props) => {
  // const ref = useRef(null)
  const editor = useSlate()
  // const [show, setShow] = useState(false)

  const ref = useClickAway(() => {
    const menu = ref.current
    menu.classList.remove('is-scaled')
  })
  useEffect(() => {
    const { selection } = editor
    const menu = ref.current
    menu.classList.remove('is-scaled')
    if (
      selection &&
      Range.isCollapsed(selection) &&
      ReactEditor.isFocused(editor)
    ) {
      const match = Editor.above(editor, {
        match: (node) => node.type === 'paragraph',
      })

      if (match) {
        const [node, path] = match
        // const start = Editor.start(editor, path)
        // if (Point.equals(selection.anchor, start)) {
        // TODO: 删掉再回退图片时，按钮位置会有问题？？可能与图片的显示方式有关（先隐藏再显示）
        // if (Editor.string(editor, path).length === 0) {
        if (
          node.children.length === 1 &&
          Array.from(Node.texts(node)).length === 1 &&
          Node.string(node) === ''
        ) {
          const el = ReactEditor.toDOMNode(editor, node)
          const rect = el.getBoundingClientRect()
          menu.style.left = `${rect.left - 55}px`
          menu.style.top = `${rect.top + window.pageYOffset - 31}px`
          menu.style.opacity = 1
          return
        }
      }
    }
    menu.style.opacity = 0
  })

  return (
    <Portal>
      <div
        ref={ref}
        className={cx(
          'tooltip-menu',
          css`
            position: absolute;
            opacity: 0;
          `
        )}
      >
        <button
          ref={ref}
          className={css`
            // transition: opacity 0.25s ease-in-out;
          `}
          onMouseDown={(event) => {
            event.preventDefault()
            // setShow((show) => !show)
            ref.current.classList.toggle('is-scaled')
          }}
        >
          <Icon
            type="plus-circle"
            style={{
              // width: 30,
              // height: 23,
              position: 'relative',
              left: 5,
              top: 4,
            }}
          />
        </button>
        <div
          className={cx(
            css`
              margin-left: 9px;
              display: inline-block;
              width: 0;
            `
          )}
        >
          <button
            className="tooltip-btn"
            onMouseDown={(event) => {
              event.preventDefault()
              selectImage(editor, true)
            }}
          >
            <Icon type="camera" style={{ width: 18, height: 18, top: -4 }} />
          </button>
          <button className="tooltip-btn">
            <Icon type="video" style={{ width: 18, height: 18, top: -4 }} />
          </button>
          <button className="tooltip-btn">
            <Icon type="file" style={{ width: 18, height: 18, top: -4 }} />
          </button>
        </div>
      </div>
    </Portal>
  )
}

const toggleBlock = (editor, format) => {
  // fixChromeDoubleClickBug(editor)

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
      className={isActive ? 'active' : ''}
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
      className={isActive ? 'active' : ''}
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

// BUG and COMPT: chrome下双击选中会有bug，会选中下一个block void element中的zero-width字符
const fixChromeDoubleClickBug = (editor) => {
  const { selection } = editor
  if (selection && selection.focus.offset === 1) {
    const [node, _] = Editor.node(editor, Path.parent(selection.focus.path))
    if (Editor.isVoid(editor, node) && Editor.isBlock(editor, node)) {
      Transforms.move(editor, { reverse: true, edge: 'focus' })
    }
  }
}

export default Slator
