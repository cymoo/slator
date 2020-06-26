import React, { useState, useEffect } from 'react'
import imageExtensions from 'image-extensions'
import isUrl from 'is-url'
import { Editor, Transforms, Path } from 'slate'
import { useClickAway } from './utils'
import {
  useEditor,
  useFocused,
  useSelected,
  ReactEditor,
  useReadOnly,
  useSlate,
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

const urls = new Map()

export const ImageElement = (props) => {
  const {
    attributes,
    children,
    element,
    imageUploadRequest,
    onImageUploadSuccess,
    onImageUploadError,
  } = props
  // console.log(element)

  const editor = useEditor()
  const selected = useSelected()
  const focused = useFocused()
  const readOnly = useReadOnly()

  const [captionShow, setCaptionShow] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ref = useClickAway(() => setCaptionShow(false))

  const { file, url, alt, id } = element

  useEffect(() => {
    if (url) return

    if (urls.has(id)) {
      console.log('when undo or redo...')
      const [match] = Editor.nodes(editor, {
        match: (node) => node.type === 'image' && node.id === id,
        at: [],
      })
      if (match) {
        setLoading(false)
        // TODO: file在element中消失了？ why???
        HistoryEditor.withoutSaving(editor, () => {
          Transforms.setNodes(
            editor,
            { file: null, url: urls.get(id) },
            { at: match[1] }
          )
        })
      }
      return
    }

    console.log('when uploading...')
    setLoading(true)
    imageUploadRequest()
      .then((data) => {
        setError(null)
        onImageUploadSuccess?.(data)
        urls.set(id, data.url)
        const [match] = Editor.nodes(editor, {
          match: (node) => node.type === 'image' && node.id === id,
          at: [],
        })
        if (match) {
          HistoryEditor.withoutSaving(editor, () => {
            Transforms.setNodes(
              editor,
              { file: null, url: data.url },
              { at: match[1] }
            )
          })
        }
      })
      .catch((err) => {
        console.log('error')
        setError(err)
        onImageUploadError?.(err)
      })
      .finally(() => {
        setLoading(false)
      })
    // setTimeout(() => {
    //   console.log('still uploading...')
    //   const url =
    //     ''
    //   urls.set(id, url)
    //
    //   const [match] = Editor.nodes(editor, {
    //     match: (node) => node.id === id,
    //     at: [],
    //   })
    //   if (match) {
    //     setLoading(false)
    //     HistoryEditor.withoutSaving(editor, () => {
    //       Transforms.setNodes(editor, { file: null, url }, { at: match[1] })
    //     })
    //   }
    // }, 3000)
  }, [id, url])

  return (
    <figure {...attributes}>
      <div
        ref={ref}
        contentEditable={false}
        style={{ textAlign: 'center', marginTop: 30 }}
      >
        <img
          onLoad={() => {
            // console.log('image loaded')
          }}
          onClick={(event) => {
            event.preventDefault()
            setCaptionShow(true)
          }}
          // TODO: where to revoke objectURL
          src={url || window.URL.createObjectURL(file)}
          alt={alt}
          className={css`
            display: inline-block;
            width: 100%;
            height: auto;
            box-shadow: ${selected && focused ? '0 0 0 3px #B4D5FF' : 'none'};
          `}
        />
        {loading && <span>loading...</span>}
        {error && <span style={{ color: 'red' }}>网络错误，稍后再重试</span>}
        <figcaption
          style={{
            opacity: !captionShow && alt === '' ? 0 : 1,
            transition: 'opacity 0.13s ease-in-out',
          }}
        >
          {readOnly ? (
            alt
          ) : (
            <CaptionInput
              // style={{ opacity: 1 }}
              caption={alt}
              onChange={(val) => {
                setCaptionShow(true)
                const path = ReactEditor.findPath(editor, element)
                Transforms.setNodes(editor, { alt: val }, { at: path })
              }}
              onEnter={() => {
                setCaptionShow(false)
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

const CaptionInput = ({ caption, onChange, onEnter, ...rest }) => {
  // const [value, setValue] = useState(caption || '')
  return (
    <input
      {...rest}
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
      onKeyDown={(event) => {
        event.stopPropagation()
        // TODO: 默认的Ctrl + Z 无法撤销？ why?
        // if (Hotkeys.isUndo(event)) {
        //   // event.target.value = ''
        //   onChange('')
        // }
      }}
      value={caption}
      onChange={(event) => {
        event.stopPropagation()
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
          Transforms.insertNodes(editor, {
            type: 'image',
            id: randomString(),
            url: '',
            alt: '',
            file: ref.current.files[0],
            children: [{ text: '' }],
          })
          // uploadImage(editor, ref.current.files[0], () => {
          //   return new Promise((resolve) => {
          //     setTimeout(() => {
          //       ref.current.value = ''
          //       resolve({
          //         url:
          //           'https://www.bing.com/th?id=OHR.SantaElena_ZH-CN8036210800_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=HpEdgeAn',
          //       })
          //     }, 3000)
          //   })
          // })
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
