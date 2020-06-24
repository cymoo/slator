import React, { useState } from 'react'
import imageExtensions from 'image-extensions'
import isUrl from 'is-url'
import { Editor, Transforms, Path } from 'slate'
import {
  useEditor,
  useFocused,
  useSelected,
  ReactEditor,
  useReadOnly,
} from 'slate-react'
import { randomString } from './utils'
import { HistoryEditor } from 'slate-history'

import { Button, Icon } from './components'
import { css } from 'emotion'

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

export const ImageElement = ({ attributes, children, element }) => {
  const editor = useEditor()
  const selected = useSelected()
  const focused = useFocused()
  const readOnly = useReadOnly()
  const { url, alt } = element

  return (
    <figure {...attributes}>
      <div
        contentEditable={false}
        style={{ textAlign: 'center', marginTop: 30 }}
      >
        <img
          onClick={(event) => {
            //
          }}
          src={url}
          alt={alt}
          className={css`
            display: inline-block;
            width: 100%;
            height: auto;
            box-shadow: ${selected && focused ? '0 0 0 3px #B4D5FF' : 'none'};
          `}
        />
        <figcaption>
          {readOnly ? (
            { alt }
          ) : (
            <CaptionInput
              caption={alt}
              onChange={(val) => {
                const path = ReactEditor.findPath(editor, element)
                Transforms.setNodes(editor, { alt: val }, { at: path })
              }}
              onEnter={() => {
                // https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/focus
                const path = ReactEditor.findPath(editor, element)
                // TODO: last的实现貌似有BUG...可以提交issue
                const [_, lastPath] = Editor.last(editor, path.slice(0, -1))

                // TODO: ugly...
                if (
                  Path.isParent(path, lastPath) ||
                  Path.equals(path, lastPath)
                ) {
                  Transforms.insertNodes(
                    editor,
                    {
                      type: 'paragraph',
                      children: [{ text: '' }],
                    },
                    // TODO: void元素的end是啥?
                    { at: Editor.end(editor, path) }
                  )
                  Transforms.move(editor)
                } else {
                  const start = Editor.start(editor, Path.next(path))
                  Transforms.move(editor, start)
                }
                const root = ReactEditor.toDOMNode(editor, editor)
                root.focus({ preventScroll: true })
              }}
            />
          )}
        </figcaption>
      </div>
      {children}
    </figure>
  )
}

const CaptionInput = ({ caption, onChange, onEnter }) => {
  // const [value, setValue] = useState(caption || '')
  // TODO: Ctrl + Z 无法撤销？ why?
  return (
    <input
      id="foo"
      placeholder="添加图片说明（可选）"
      onClick={(event) => event.stopPropagation()}
      // TODO: onKeyDown和onKeyUp的行为不一样...why?
      onKeyUp={(event) => {
        // event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Enter') {
          onEnter()
        }
      }}
      value={caption}
      onChange={(event) => {
        const newVal = event.target.value
        // setValue(newVal)
        onChange(newVal)
      }}
    />
  )
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
              }, 3000)
            })
          })
        }}
      />
    </Button>
  )
}

// https://developer.mozilla.org/zh-CN/docs/Web/API/File/Using_files_from_web_applications
const uploadImage = (editor, file, request) => {
  // const reader = new FileReader()
  // reader.readAsDataURL(file)
  // reader.onload = () => {
  //   const id = randomString()
  //   insertImage(editor, reader.result, id)
  // }

  // reader.onerror = () => {}
  const url = window.URL.createObjectURL(file)
  const id = randomString()
  insertImage(editor, url, id)

  request()
    .then((data) => {
      // TODO: where to place it?
      // window.URL.revokeObjectURL(url)
      const [match] = Editor.nodes(editor, {
        match: (node) => node.id === id,
      })
      if (match) {
        HistoryEditor.withoutSaving(editor, () => {
          Transforms.setNodes(editor, { url: data.url }, { at: match[1] })
        })
        // TODO: need a better way to replace image url
        for (const undo of editor.history.undos) {
          for (const op of undo) {
            if (
              op.type === 'insert_node' &&
              op.node.type === 'image' &&
              op.node.id === id
            ) {
              // node is frozen; so a clone is needed
              op.node = { ...op.node, url: data.url }
              return
            }
          }
        }
      }
    })
    .catch((err) => {
      // retry when timeout or 500 error
    })
    .finally(() => {
      //
    })
}

const insertImage = (editor, url, id, alt = '') => {
  const text = { text: '' }
  const image = { type: 'image', url, id, alt, children: [text] }
  Transforms.insertNodes(editor, image)
}

const isImageUrl = (url) => {
  if (!url) return false
  if (!isUrl(url)) return false
  const ext = new URL(url).pathname.split('.').pop()
  return imageExtensions.includes(ext)
}
