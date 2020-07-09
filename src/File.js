import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import isUrl from 'is-url'
import { Editor, Transforms, Path } from 'slate'
import { useClickAway } from './utils'
import { useEditor, useFocused, useSelected, ReactEditor } from 'slate-react'
import { randomString } from './utils'
import { HistoryEditor } from 'slate-history'

import { Button, Icon, LoadingBar } from './components'
import { css, cx } from 'emotion'

export const withFiles = (editor) => {
  const { insertData, isVoid, insertBreak } = editor

  editor.isVoid = (element) => {
    return element.type === 'file' ? true : isVoid(element)
  }

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: (node) => node.type === 'file',
    })
    if (match) {
      editor.insertNode({ type: 'paragraph', children: [{ text: '' }] })
    } else {
      insertBreak()
    }
  }

  editor.insertData = (data) => {
    const { files } = data

    if (files && files.length > 0) {
      for (const file of files) {
        const [mime] = file.type.split('/')
        if (mime === 'xxx') {
          insertFile(editor, file, '')
        }
      }
    } else {
      insertData(data)
    }
  }

  return editor
}

export const FileElement = (props) => {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <div {...props.attribute} contentEditable={false}>
      <div>
        className=
        {css`
          box-shadow: ${selected && focused ? '0 0 0 3px #B4D5FF' : 'none'};
        `}
        />
        {props.children}
      </div>
    </div>
  )
}

export const FileButton = () => {
  const editor = useEditor()

  return (
    <Button
      onMouseDown={(event) => {
        event.preventDefault()
        selectFile(editor)
      }}
    >
      <Icon type="file" />
    </Button>
  )
}

export const insertFile = (editor) => {
  //
}

export const selectFile = (editor) => {
  //
}
