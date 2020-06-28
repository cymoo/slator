import React from 'react'
import { Editor, Transforms, Range, Point } from 'slate'

const SHORTCUTS = {
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '*': 'list-item',
  '-': 'list-item',
  '1.': 'list-item',
  // '+': 'list-item',
  '>': 'block-quote',
  '``': 'code-block',
  '[]-': 'check-list',
  '[x]-': 'check-list',
}

export const withMarkdownShortcuts = (editor) => {
  const { deleteBackward, insertText } = editor

  editor.insertText = (text) => {
    const { selection } = editor

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection
      const block = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range)
      const type = SHORTCUTS[beforeText]
      const props = { type }

      if (beforeText === '[]-') props.checked = false
      if (beforeText === '[x]-') props.checked = true

      if (type) {
        Transforms.select(editor, range)
        Transforms.delete(editor)
        Transforms.setNodes(editor, props, {
          match: (n) => Editor.isBlock(editor, n),
        })

        // TODO: 多重再回退时嵌套会有bug
        if (type === 'list-item') {
          const list = {
            type: beforeText === '1.' ? 'numbered-list' : 'bulleted-list',
            children: [],
          }
          Transforms.wrapNodes(editor, list, {
            match: (n) => n.type === 'list-item',
          })
        }

        return
      }
    }

    insertText(text)
  }

  // FIXME: 删除多重嵌套的元素时（当黏贴HTML时才会出现），需要做额外的处理
  editor.deleteBackward = (...args) => {
    const { selection } = editor

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
          Transforms.setNodes(editor, { type: 'paragraph' })

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

      deleteBackward(...args)
    }
  }

  return editor
}
