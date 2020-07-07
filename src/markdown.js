import React from 'react'
import { Editor, Point, Range, Transforms, Text, Location } from 'slate'

const BLOCK_PATTERN = {
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '>': 'block-quote',
  '``': 'code-block',
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '1.': 'list-item',
  '[]-': 'check-list',
  '[x]-': 'check-list',
  '---': 'divider',
}

// noinspection RegExpRedundantEscape
const URL_PATTERN = /!?\[(.+)\]\((\S+)(\s.+)?/
const INLINE_CODE_PATTERN = /`(.+)/
const STRIKE_PATTERN = /~~(.+)~/
const ITALIC_PATTERN = /__(.+)_/
const BOLD_PATTERN = /\*\*(.+)\*/

export const withMarkdownShortcuts = (editor) => {
  const { deleteBackward, insertText } = editor

  editor.insertText = (text) => {
    const { selection } = editor
    // heading, blockquote, code-block, list, divider
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const beforeRange = getBeforeRange(editor)
      const beforeText = Editor.string(editor, beforeRange)
      const type = BLOCK_PATTERN[beforeText]
      const props = { type }
      if (beforeText === '[]-') props.checked = false
      if (beforeText === '[x]-') props.checked = true

      if (type) {
        Transforms.select(editor, beforeRange)
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

    // image or link
    if (text === ')' && selection && Range.isCollapsed(selection)) {
      const beforeText = Editor.string(editor, getBeforeRange(editor))
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
        Editor.insertNode(editor, element)
        return
      }
    }

    // inline code
    if (text === '`' && selection && Range.isCollapsed(selection)) {
      const beforeText = Editor.string(editor, getBeforeRange(editor))
      const match = INLINE_CODE_PATTERN.exec(beforeText)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 1, 0, 'code')
        return
      }
    }

    // italic
    if (text === '_' && selection && Range.isCollapsed(selection)) {
      const beforeText = Editor.string(editor, getBeforeRange(editor))
      const match = ITALIC_PATTERN.exec(beforeText)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 2, 1, 'italic')
        return
      }
    }
    // bold
    if (text === '*' && selection && Range.isCollapsed(selection)) {
      const beforeText = Editor.string(editor, getBeforeRange(editor))
      const match = BOLD_PATTERN.exec(beforeText)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 2, 1, 'bold')
        return
      }
    }

    // strikethrough
    if (text === '~' && selection && Range.isCollapsed(selection)) {
      const beforeText = Editor.string(editor, getBeforeRange(editor))
      console.log(beforeText)
      const match = STRIKE_PATTERN.exec(beforeText)
      if (match) {
        const [_, text] = match
        console.log(text)
        applyMarkOnRange(editor, text, 2, 1, 'strikethrough')
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

const getBeforeRange = (editor) => {
  const { selection } = editor
  const { anchor } = selection
  const block = Editor.above(editor, {
    match: (n) => Editor.isBlock(editor, n),
  })
  const path = block ? block[1] : []
  const start = Editor.start(editor, path)
  return { anchor, focus: start }
}

const applyMarkOnRange = (
  editor,
  text,
  ll,
  rl,
  mark,
  removeMarkOnDone = true
) => {
  if (rl !== 0) {
    Transforms.delete(editor, {
      distance: rl,
      unit: 'character',
      reverse: true,
    })
  }
  Transforms.move(editor, {
    distance: text.length + ll,
    unit: 'character',
    reverse: true,
  })
  Transforms.delete(editor, {
    distance: ll,
    unit: 'character',
  })
  Transforms.move(editor, {
    distance: text.length,
    unit: 'character',
    edge: 'focus',
  })
  // NOTE: 当嵌套的格式存在时，第二次选区的起点会在上一个的最后，比如~~**foo**~~，如果不做以下处理，
  // 会将上一个节点也格式化。。。好像应该处理此处hang的情况吧。。。
  // TODO: 此处应该是slate的bug，这样的bug也太难定位了吧。。。fxxk
  if (
    Editor.isEnd(editor, editor.selection.anchor, editor.selection.anchor.path)
  ) {
    Transforms.move(editor, {
      distance: 1,
      edge: 'anchor',
      unit: 'offset',
    })
  }
  Editor.addMark(editor, mark, true)
  Transforms.collapse(editor, { edge: 'focus' })
  if (removeMarkOnDone) {
    Editor.removeMark(editor, mark)
  }
}
