import React from 'react'
import { Editor, Point, Range, Transforms } from 'slate'
import { truncateLeft } from './utils'

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
const URL_PATTERN = /!?\[(.+)\]\((\S+)(\s.+)?\]/
const INLINE_CODE_PATTERN = /`(.+)`/
const STRIKE_PATTERN = /~~(.+)~~/
const ITALIC_PATTERN = /__(.+)__/
const BOLD_PATTERN = /\*\*(.+)\*\*/

const MAX_CHARS_TO_MATCH = 300

export const withMarkdownShortcuts = (editor) => {
  const { insertText } = editor

  editor.insertText = (text) => {
    const { selection } = editor
    // heading, blockquote, code-block, list, divider
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const beforeRange = getBeforeRange(editor)
      const beforeText = truncateLeft(
        Editor.string(editor, beforeRange),
        MAX_CHARS_TO_MATCH
      )
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
      const beforeText = truncateLeft(
        Editor.string(editor, getBeforeRange(editor)),
        MAX_CHARS_TO_MATCH
      )
      const match = URL_PATTERN.exec(`${beforeText})`)

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
      const beforeText = truncateLeft(
        Editor.string(editor, getBeforeRange(editor)),
        MAX_CHARS_TO_MATCH
      )
      const match = INLINE_CODE_PATTERN.exec(`${beforeText}\``)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 1, 0, 'code')
        return
      }
    }

    // italic
    if (text === '_' && selection && Range.isCollapsed(selection)) {
      const beforeText = truncateLeft(
        Editor.string(editor, getBeforeRange(editor)),
        MAX_CHARS_TO_MATCH
      )
      const match = ITALIC_PATTERN.exec(`${beforeText}_`)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 2, 1, 'italic')
        return
      }
    }

    // bold
    if (text === '*' && selection && Range.isCollapsed(selection)) {
      const beforeText = truncateLeft(
        Editor.string(editor, getBeforeRange(editor)),
        MAX_CHARS_TO_MATCH
      )
      const match = BOLD_PATTERN.exec(`${beforeText}*`)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 2, 1, 'bold')
        return
      }
    }

    // strikethrough
    if (text === '~' && selection && Range.isCollapsed(selection)) {
      const beforeText = truncateLeft(
        Editor.string(editor, getBeforeRange(editor)),
        MAX_CHARS_TO_MATCH
      )
      const match = STRIKE_PATTERN.exec(`${beforeText}~`)
      if (match) {
        const [_, text] = match
        applyMarkOnRange(editor, text, 2, 1, 'strikethrough')
        return
      }
    }

    const marks = Editor.marks(editor)
    for (const mark of ['code', 'bold', 'italic', 'strikethrough']) {
      if (marks[`no-${mark}`]) {
        Editor.removeMark(editor, mark)
        Editor.removeMark(editor, `no-${mark}`)
      }
    }
    insertText(text)
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

// TODO: 这些操作是否只会触发以下render？
// TODO: mark的机制有bug，如果range的起点是上一个element的end point，即hanging，此时不应该对上个element施加mark
const applyMarkOnRange = (editor, text, ll, rl, mark) => {
  /* 1. delete trailing character */
  if (rl !== 0) {
    Transforms.delete(editor, {
      distance: rl,
      reverse: true,
    })
  }

  /* 2. delete leading characters */
  // TODO: 如果使用以下的方式，会导致删除后光标移动至上个block的end point (hang?)
  // Transforms.move(editor, {
  //   distance: text.length + ll,
  //   reverse: true,
  // })
  // Transforms.delete(editor, {
  //   distance: ll,
  // })

  Transforms.move(editor, {
    distance: text.length,
    reverse: true,
  })
  Transforms.delete(editor, {
    distance: ll,
    reverse: true,
  })

  /* 3. select text and apply marks */
  // TODO: 当hang时，即位于上一个元素的end point，move的距离会少1, bug?
  Transforms.move(editor, {
    distance: text.length,
    edge: 'focus',
  })
  // TODO: Editor.unhangRange的不完备？
  // let range = Editor.unhangRange(editor, editor.selection)
  // Transforms.setSelection(editor, range)
  unHangRange(editor)
  Editor.addMark(editor, mark, true)

  /* 4. a trick to select the last character and set a flag */
  Transforms.move(editor, {
    distance: text.length - 1,
    edge: 'anchor',
  })
  unHangRange(editor)
  Editor.addMark(editor, `no-${mark}`, true)

  /* 5. reset the cursor */
  Transforms.collapse(editor, { edge: 'focus' })
}

export const unHangRange = (editor) => {
  const { selection } = editor
  const { anchor, focus } = selection

  if (Editor.isEnd(editor, anchor, anchor.path)) {
    Transforms.move(editor, {
      distance: 1,
      edge: 'anchor',
      unit: 'offset',
    })
  }

  if (focus.offset === 0) {
    Transforms.move(editor, {
      distance: 1,
      edge: 'focus',
      unit: 'offset',
      reverse: true,
    })
  }
}
