import React from 'react'
import { Editor, Transforms, Range, Point } from 'slate'
import { useEditor, useReadOnly, useSlate, ReactEditor } from 'slate-react'
import { Button, Icon } from './components'
import { cx, css } from 'emotion'

export const withCheckList = (editor) => {
  const { deleteBackward } = editor

  editor.deleteBackward = (...args) => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        match: (n) => n.type === 'check-list',
      })

      if (match) {
        const [, path] = match
        const start = Editor.start(editor, path)

        if (Point.equals(selection.anchor, start)) {
          Transforms.setNodes(
            editor,
            { type: 'paragraph' },
            { match: (n) => n.type === 'check-list' }
          )
          return
        }
      }
    }

    deleteBackward(...args)
  }

  return editor
}

export const CheckListButton = () => {
  const editor = useSlate()
  const isActive = isCheckListActive(editor)

  return (
    <Button
      active={isActive}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleCheckList(editor)
      }}
    >
      <Icon type="checkbox-check" color={isActive ? '#1e1e1e' : '#6a6f7b'} />
    </Button>
  )
}

export const CheckListElement = ({ attributes, children, element }) => {
  const editor = useEditor()
  const readOnly = useReadOnly()
  const { checked } = element
  return (
    <div
      {...attributes}
      className={cx(
        'check-list',
        css`
          margin-top: 2em;
          display: flex;
          flex-direction: row;
          align-items: center;
          & + & {
            margin-top: 15px;
          }
        `
      )}
    >
      <span contentEditable={false} className="check-list-btn">
        <Icon
          type={checked ? 'checkbox-check' : 'checkbox-uncheck'}
          onClick={(event) => {
            event.preventDefault()
            if (!readOnly) {
              const path = ReactEditor.findPath(editor, element)
              // TODO: readonly对以下也生效
              Transforms.setNodes(editor, { checked: !checked }, { at: path })
            }
          }}
        />
      </span>
      <span
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className={cx(
          'check-list-item',
          css`
            flex: 1;
            opacity: ${checked ? 0.666 : 1};
            // text-decoration: ${checked ? 'none' : 'line-through'};
            &:focus {
              outline: none;
            }
          `
        )}
      >
        {children}
      </span>
    </div>
  )
}

const isCheckListActive = (editor) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => n.type === 'check-list',
  })
  return !!match
}

const toggleCheckList = (editor) => {
  const isActive = isCheckListActive(editor)
  Transforms.setNodes(
    editor,
    isActive ? { type: 'paragraph' } : { type: 'check-list', checked: true }
  )
}
