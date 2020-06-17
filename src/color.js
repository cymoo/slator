import React, { useCallback, useState } from 'react'
import { Button, Icon } from './components'
import { useClickAway } from './utils'
import { TwitterPicker, SketchPicker } from 'react-color'
import { Editor } from 'slate'
import { useSlate } from 'slate-react'
import { css } from 'emotion'

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

export const ColorButton = (props) => {
  const { format } = props
  const [show, setShow] = useState(false)
  const [color, setColor] = useState('#7bdcb5')
  const editor = useSlate()
  const ref = useClickAway(
    useCallback(() => {
      show && setShow(false)
    }, [show])
  )
  const isActive = isMarkActive(editor, format)

  return (
    <Button
      active={isActive}
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setShow(false)
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        if (event.target.tagName.toLowerCase() === 'div') {
          return
        }
        setShow((show) => !show)
      }}
    >
      <Icon type={format === 'color' ? 'color-text' : 'color-fill'} />
      {show && (
        <SketchPicker
          className={css`
            position: absolute !important;
            top: 32px;
          `}
          color={color}
          onChange={(color) => {
            setColor(color.hex)
            Editor.removeMark(editor, format)
            Editor.addMark(editor, format, color.hex)
          }}
        />
      )}
    </Button>
  )
}
