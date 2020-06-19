import React from 'react'
import { jsx } from 'slate-hyperscript'
import { Transforms } from 'slate'

// TODO: 黏贴HTML时，对于嵌套的block，backspace时需要额外处理
const ELEMENT_TAGS = {
  H1: () => ({ type: 'heading-one' }),
  H2: () => ({ type: 'heading-two' }),
  H3: () => ({ type: 'heading-three' }),
  H4: () => ({ type: 'heading-four' }),
  H5: () => ({ type: 'heading-five' }),
  H6: () => ({ type: 'heading-six' }),
  P: () => ({ type: 'paragraph' }),
  BLOCKQUOTE: () => ({ type: 'block-quote' }),
  PRE: () => ({ type: 'code-block' }),
  OL: () => ({ type: 'numbered-list' }),
  UL: () => ({ type: 'bulleted-list' }),
  LI: () => ({ type: 'list-item' }),
  A: (el) => ({ type: 'link', url: el.getAttribute('href') }),
  IMG: (el) => ({ type: 'image', url: el.getAttribute('src') }),
}

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
const TEXT_TAGS = {
  CODE: () => ({ code: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  S: () => ({ strikethrough: true }),
  DEL: () => ({ strikethrough: true }),
  STRONG: () => ({ bold: true }),
  U: () => ({ underline: true }),
  SUP: () => ({ sup: true }),
  SUB: () => ({ sub: true }),
}

export const deserialize = (el) => {
  if (el.nodeType === 3) {
    return el.textContent
  } else if (el.nodeType !== 1) {
    return null
  } else if (el.nodeName === 'BR') {
    return '\n'
  }

  const { nodeName } = el
  let parent = el

  if (
    nodeName === 'PRE' &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === 'CODE'
  ) {
    parent = el.childNodes[0]
  }
  const children = Array.from(parent.childNodes).map(deserialize).flat()

  if (el.nodeName === 'BODY') {
    return jsx('fragment', {}, children)
  }

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = ELEMENT_TAGS[nodeName](el)
    return jsx('element', attrs, children)
  }

  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName](el)
    return children.map((child) => jsx('text', attrs, child))
  }

  return children
}

export const withPasteHtml = (editor) => {
  const { insertData, isInline, isVoid } = editor

  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element)
  }

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element)
  }

  editor.insertData = (data) => {
    const html = data.getData('text/html')

    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const fragment = deserialize(parsed.body)
      Transforms.insertFragment(editor, fragment)
      return
    }

    insertData(data)
  }

  return editor
}
