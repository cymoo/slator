import React from 'react'
import { Editor, Point, Range, Transforms } from 'slate'

const SHORTCUTS = {
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '---': 'divider',
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '1.': 'list-item',
  '>': 'block-quote',
  '``': 'code-block',
  '[]-': 'check-list',
  '[x]-': 'check-list',
}

const URL_PATTERN = /!?\[(.+)\]\((\S+)(\s.+)?/g
const INLINE_CODE_PATTERN = /`(.+)/g
const STRIKE_PATTERN = /~~(.+)~/g

export const getTextBeforeCursor = (editor) => {
  const { selection } = editor
  const { anchor } = selection
  const block = Editor.above(editor, {
    match: (n) => Editor.isBlock(editor, n),
  })
  const path = block ? block[1] : []
  const start = Editor.start(editor, path)
  const range = { anchor, focus: start }
  return Editor.string(editor, range)
}

export const withMarkdownShortcuts = (editor) => {
  const { deleteBackward, insertText } = editor

  editor.insertText = (text) => {
    const { selection } = editor
    // block element
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const { selection } = editor
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

    // `: inline code
    if (text === '`' && selection && Range.isCollapsed(selection)) {
      const beforeText = getTextBeforeCursor(editor)
      const match = INLINE_CODE_PATTERN.exec(beforeText)
      if (match) {
        const [full, text] = match
        Transforms.move(editor, {
          distance: full.length,
          unit: 'character',
          reverse: true,
        })
        Transforms.delete(editor, { distance: 1, unit: 'character' })
        Transforms.move(editor, {
          distance: text.length,
          unit: 'character',
          edge: 'focus',
        })
        Editor.addMark(editor, 'code', true)
        Transforms.collapse(editor, { edge: 'focus' })
        Editor.removeMark(editor, 'code')
        return
      }
    }

    // *: italic; **: bold; *** italic and bold
    if (text === '*' && selection && Range.isCollapsed(selection)) {
      //
    }

    // ~~: strikethrough
    if (text === '~' && selection && Range.isCollapsed(selection)) {
      const beforeText = getTextBeforeCursor(editor)
      const match = STRIKE_PATTERN.exec(beforeText)
      if (match) {
        const [full, text] = match
        // delete the leading two ~~
        Transforms.move(editor, {
          distance: full.length,
          unit: 'character',
          reverse: true,
        })
        Transforms.delete(editor, { distance: 2, unit: 'character' })
        // delete the trailing one ~
        Transforms.move(editor, {
          distance: text.length,
          unit: 'character',
        })
        Transforms.delete(editor, { distance: 1, unit: 'character' })
        //
        Transforms.move(editor, {
          distance: text.length,
          unit: 'character',
          edge: 'anchor',
          reverse: true,
        })
        Editor.addMark(editor, 'strikethrough', true)
        Transforms.collapse(editor, { edge: 'focus' })
        Editor.removeMark(editor, 'strikethrough')
        return
      }
    }

    // [text](url "title") | [text](url) : link
    // ![alt](url "title") | ![alt](url) : image
    if (text === ')' && selection && Range.isCollapsed(selection)) {
      const beforeText = getTextBeforeCursor(editor)
      const match = URL_PATTERN.exec(beforeText)

      if (match) {
        const [full, text, url, title] = match
        let element
        if (full.startsWith('!')) {
          element = {
            type: 'image',
            url,
            alt: text,
            title: title && title.trim(),
            children: [{ text: '' }],
          }
        } else {
          element = {
            type: 'link',
            url,
            title: title && title.trim(),
            children: [{ text }],
          }
        }
        Transforms.move(editor, {
          distance: full.length,
          unit: 'character',
          reverse: true,
          edge: 'anchor',
        })
        // Transforms.select(editor, editor.selection)
        Editor.insertNode(editor, element)
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
