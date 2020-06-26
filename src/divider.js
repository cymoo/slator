import React from 'react'
import { Editor } from 'slate'
import { useSlate } from 'slate-react'
import { Button, Icon } from './components'

export const withDivider = (editor) => {
  const { isVoid } = editor

  editor.isVoid = (element) => {
    return element.type === 'divider' ? true : isVoid(element)
  }

  return editor
}

export const DividerElement = (props) => {
  return (
    <div
      {...props.attribute}
      contentEditable={false}
      style={{ userSelect: 'None' }}
    >
      <hr />
      {props.children}
    </div>
  )
}

export const DividerButton = () => {
  const editor = useSlate()
  return (
    <Button
      active={isDividerActive(editor)}
      onMouseDown={(event) => {
        event.preventDefault()
        Editor.insertNode(editor, { type: 'divider', children: [{ text: '' }] })
        // TODO: 如果是最后一个元素时，插入一个段落，否则光标移至下一个block element
        Editor.insertNode(editor, {
          type: 'paragraph',
          children: [{ text: '' }],
        })
      }}
    >
      <Icon type="minus" />
    </Button>
  )
}

const isDividerActive = (editor) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => n.type === 'divider',
  })

  return !!match
}
