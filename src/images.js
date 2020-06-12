import React from 'react'
import imageExtensions from 'image-extensions'
import isUrl from 'is-url'
import { Editor, Transforms } from 'slate'
import { useEditor } from 'slate-react'
import { randomString } from './utils'

import { Button, Icon } from './components'

export const withImages = (editor) => {
  const { insertData, isVoid, insertBreak } = editor

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element)
  }

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: (node) => node.type === 'image',
    })
    if (match) {
      editor.insertNode({ type: 'paragraph', children: [{ text: '' }] })
    } else {
      insertBreak()
    }
  }

  editor.insertData = (data) => {
    const text = data.getData('text/plain')
    const { files } = data

    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader()
        const [mime] = file.type.split('/')

        if (mime === 'image') {
          reader.addEventListener('load', () => {
            const url = reader.result
            insertImage(editor, url)
          })

          reader.readAsDataURL(file)
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

export const ImageButton = () => {
  const editor = useEditor()
  const ref = React.useRef()

  return (
    <Button
      onMouseDown={(event) => {
        event.preventDefault()
        ref.current.click()
      }}
    >
      <Icon type="image" />
      <input
        type="file"
        ref={ref}
        style={{ display: 'none' }}
        onChange={() => {
          uploadImage(editor, ref.current.files[0], () => {
            return new Promise((resolve) => {
              setTimeout(() => {
                ref.current.value = ''
                resolve({
                  url:
                    'https://www.bing.com/th?id=OHR.SantaElena_ZH-CN8036210800_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=HpEdgeAn',
                })
              }, 1000)
            })
          })
        }}
      />
    </Button>
  )
}

const uploadImage = (editor, file, request) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)

  reader.onload = () => {
    const id = randomString()
    insertImage(editor, reader.result, id)

    request()
      .then((data) => {
        const [match] = Editor.nodes(editor, {
          match: (node) => node.id === id,
        })
        if (match) {
          Transforms.setNodes(editor, { url: data.url }, { at: match[1] })
        }
      })
      .catch((err) => {})
  }

  reader.onerror = () => {}
}

const insertImage = (editor, url, id) => {
  const text = { text: '' }
  const image = { type: 'image', url, id, children: [text] }
  Transforms.insertNodes(editor, image)
}

const isImageUrl = (url) => {
  if (!url) return false
  if (!isUrl(url)) return false
  const ext = new URL(url).pathname.split('.').pop()
  return imageExtensions.includes(ext)
}
