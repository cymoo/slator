import { Editor, Transforms, Node } from 'slate'
import React from 'react'

export const withCodeBlock = editor => {
  const { insertBreak } = editor

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: node => node.type === 'code-block',
    })
    if (match) {
      const codeText = Editor.string(editor, match[1])
      if (codeText.endsWith('\n\n')) {
        editor.deleteBackward()
        editor.insertNode({ type: 'paragraph', children: [{ text: '' }] })
      } else {
        editor.insertText('\n')
      }
      return
    }
    insertBreak()
  }

  return editor
}

export const toggleCodeBlock = editor => {
  const [match] = Editor.nodes(editor, {
    match: node => node.type === 'code-block',
  })
  if (match) {
    const codeText = Array.from(
      Editor.nodes(editor, {
        match: node => Editor.isBlock(editor, node)
      })
    ).map(entry => Editor.string(editor, entry[1])).join('\n')

    const paragraphs = codeText
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => ({ type: 'paragraph', children: [{ text: line }] }))

    Transforms.removeNodes(editor)
    paragraphs.forEach(node => editor.insertNode(node))
  } else {
    const codeText = Array.from(
      Editor.nodes(editor, {
        match: node => Editor.isBlock(editor, node)
      })
    ).map(entry => Node.string(entry[0])).join('\n')
    Transforms.removeNodes(editor)
    editor.insertNode({ type: 'code-block', children: [{ text: codeText }] })
  }
}

export const CodeBlockElement = ({ attributes, children, element }) => {
  return (
    <pre {...attributes}>
      <code>{children}</code>
    </pre>
  )
}
