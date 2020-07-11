import { Editor, Transforms, Node, Range } from 'slate'
import React from 'react'
import { css } from 'emotion'

export const withCodeBlock = (editor) => {
  const { insertBreak } = editor

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: (node) => node.type === 'code-block',
    })
    if (match) {
      const [_, path] = match
      const codeText = Editor.string(editor, {
        anchor: Editor.start(editor, path),
        focus: editor.selection.anchor,
      })
      const indents = getLastIndent(codeText)
      if (codeText.endsWith(`\n${indents}\n${indents}`)) {
        Transforms.delete(editor, {
          distance: indents.length * 2 + 2,
          unit: 'character',
          reverse: true,
        })
        editor.insertNode({ type: 'paragraph', children: [{ text: '' }] })
      } else {
        editor.insertText(`\n${indents}`)
      }
      return
    }
    insertBreak()
  }

  return editor
}

export const toggleCodeBlock = (editor) => {
  const [match] = Editor.nodes(editor, {
    match: (node) => node.type === 'code-block',
  })
  const selection = editor.selection

  if (!match && Range.isCollapsed(selection)) {
    Transforms.setNodes(editor, { type: 'code-block' })
    return
  }

  if (match) {
    const nodes = Array.from(
      Editor.nodes(editor, {
        match: (node) => Editor.isBlock(editor, node),
      })
    )
    const codeText = nodes
      .map((entry) => Editor.string(editor, entry[1]))
      .join('\n')

    const paragraphs = codeText
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => ({ type: 'paragraph', children: [{ text: line }] }))

    if (paragraphs.length === 1) {
      Transforms.setNodes(editor, { type: 'paragraph' })
      return
    }

    Transforms.removeNodes(editor)
    paragraphs.forEach((node) => editor.insertNode(node))
  } else {
    const codeText = Array.from(
      Editor.nodes(editor, {
        match: (node) => Editor.isBlock(editor, node),
      })
    )
      .map((entry) => Node.string(entry[0]))
      .join('\n')
    Transforms.removeNodes(editor)
    editor.insertNode({ type: 'code-block', children: [{ text: codeText }] })
  }
}

export const CodeBlock = ({ attributes, children, ...rest }) => {
  return (
    <pre
      {...attributes}
      className={css`
        padding: 15px;
        margin-bottom: 10px;
        background-color: #f1f1f1;
        line-height: 1.3;
      `}
      {...rest}
    >
      <code>{children}</code>
    </pre>
  )
}

const getLastIndent = (text) => {
  let pos = -1
  for (let i = text.length - 1; i >= 0; i--) {
    const chr = text[i]
    if (chr === '\n') {
      if (pos === -1) return ''
      else return text.substring(i + 1, pos + 1)
    } else {
      if (' \t'.includes(chr)) {
        if (pos === -1) pos = i
      } else {
        pos = -1
      }
    }
  }
  return ''
}
