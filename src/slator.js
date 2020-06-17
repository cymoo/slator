import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import isHotkey from 'is-hotkey'
import {
  Editable,
  withReact,
  useSlate,
  Slate,
  useSelected,
  useFocused,
} from 'slate-react'
import { Editor, Transforms, createEditor } from 'slate'
import { withHistory } from 'slate-history'

import { Button, Icon, Toolbar } from './components'
import { withCodeBlock, toggleCodeBlock, CodeBlock } from './code-block'
import { withLinks, LinkButton } from './links'
import { withImages, ImageButton } from './images'
import { LinkElement } from './links'
import { ColorButton } from './color'
import { css } from 'emotion'

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const LIST_TYPES = ['numbered-list', 'bulleted-list']

const Slator = () => {
  const [value, setValue] = useState(initialValue)
  const renderElement = useCallback((props) => <Element {...props} />, [])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])
  const editor = useMemo(
    () =>
      withHistory(
        withImages(withLinks(withCodeBlock(withReact(createEditor()))))
      ),
    []
  )

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        // console.log(editor.selection)
        setValue(value)
      }}
    >
      <Toolbar style={{ display: 'flex', alignItems: 'center' }}>
        <MarkButton format="bold" icon="bold" />
        <MarkButton format="italic" icon="italic" />
        <MarkButton format="underline" icon="underline" />
        <MarkButton format="strikethrough" icon="strikethrough" />
        <BlockButton format="code-block" icon="code-slash" />
        <BlockButton format="block-quote" icon="quotes-right" />
        <BlockButton format="heading-one" icon="header" />
        {/* <BlockButton format="heading-two" icon="format-header2" />*/}
        <BlockButton format="numbered-list" icon="list-numbered" />
        <BlockButton format="bulleted-list" icon="list-bulleted" />
        <LinkButton />
        <ImageButton />

        {/* <MarkButton format="underline" icon="font-size" />*/}

        {/* <MarkButton format="underline" icon="color-text" />*/}
        <ColorButton format="color" />
        <ColorButton format="background" />
        {/* <MarkButton format="underline" icon="color-fill" />*/}

        <MarkButton format="underline" icon="paragraph-left" />
        <MarkButton format="underline" icon="paragraph-right" />
        <MarkButton format="underline" icon="paragraph-justify" />
        <MarkButton format="underline" icon="paragraph-center" />

        <MarkButton format="underline" icon="indent-increase" />
        <MarkButton format="underline" icon="indent-decrease" />

        <MarkButton format="sup" icon="superscript" />
        <MarkButton format="sub" icon="subscript" />

        <MarkButton format="underline" icon="film" />
      </Toolbar>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder="Enter some rich text…"
        spellCheck
        autoFocus
        onKeyDown={(event) => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault()
              const mark = HOTKEYS[hotkey]
              toggleMark(editor, mark)
            }
          }
        }}
      />
    </Slate>
  )
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
  const { attributes, children, element } = props
  const selected = useSelected()
  const focused = useFocused()

  switch (element.type) {
    case 'image':
      return (
        <div {...attributes}>
          <div
            contentEditable={false}
            style={{ textAlign: 'center', marginBottom: 10 }}
          >
            <img
              src={element.url}
              className={css`
                display: inline-block;
                width: 100%;
                height: auto;
                box-shadow: ${selected && focused
                  ? '0 0 0 3px #B4D5FF'
                  : 'none'};
              `}
              alt="TODO..."
            />
          </div>
          {children}
        </div>
      )
    case 'link':
      return <LinkElement {...props} />
    case 'code-block':
      return <CodeBlock attributes={attributes}>{children}</CodeBlock>
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>
    default:
      return <p {...attributes}>{children}</p>
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

  if (leaf.sup) {
    children = <sup>{children}</sup>
  }

  if (leaf.sub) {
    children = <sub>{children}</sub>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  if (leaf.strikethrough) {
    children = <s>{children}</s>
  }

  return <span {...attributes}>{children}</span>
}

const BlockButton = ({ format, icon }) => {
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
    >
      {/* <Icon>{icon}</Icon>*/}
      <Icon type={icon} color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

const MarkButton = ({ format, icon }) => {
  const editor = useSlate()
  const isActive = isMarkActive(editor, format)
  return (
    <Button
      active={isActive}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    >
      <Icon type={icon} color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

const initialValue = [
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'rich', bold: true },
      { text: ' text, ' },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
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
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'Try it out for yourself!' }],
  },
]

export default Slator
