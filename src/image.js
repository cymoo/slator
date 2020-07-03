import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react'
import imageExtensions from 'image-extensions'
import isUrl from 'is-url'
import { Editor, Transforms, Path } from 'slate'
import { useClickAway } from './utils'
import { useEditor, useFocused, useSelected, ReactEditor } from 'slate-react'
import { randomString, imageValidator } from './utils'
import { HistoryEditor } from 'slate-history'

import { Button, Icon, LoadingBar } from './components'
import { css, cx } from 'emotion'

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
        const [mime] = file.type.split('/')
        if (mime === 'image') {
          insertImage(editor, file, '')
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, null, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

export const ImageElementReadOnly = (props) => {
  const { attributes, children, element } = props
  const { url, alt, width, height } = element
  const [imageLoaded, setImageLoaded] = useState(false)
  const placeholder = useRef()

  useLayoutEffect(() => {
    const el = placeholder.current
    if (!width || !height) return

    const realWidth = el.getBoundingClientRect().width
    const realHeight = (realWidth / width) * height
    el.style.height = `${realHeight}px`
  }, [])

  let placeholderStyle = {}
  let imageStyle = {
    display: 'inline-block',
    maxWidth: '100%',
    width: `${width}px`,
    height: 'auto',
    overflow: 'hidden',
  }

  if (width && height) {
    placeholderStyle = {
      display: 'inline-block',
      position: 'relative',
      maxWidth: '100%',
      width: `${width}px`,
      backgroundColor: 'rgba(242, 242, 242, 1)',
    }
    imageStyle = {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      opacity: imageLoaded ? 1 : 0,
      transition: 'opacity 0.3s ease-in',
      overflow: 'hidden',
    }
  }

  return (
    <figure {...attributes}>
      <div
        contentEditable={false}
        style={{ textAlign: 'center', marginTop: 30, position: 'relative' }}
      >
        <div ref={placeholder} style={placeholderStyle}>
          <img
            onLoad={(event) => {
              setTimeout(() => {
                setImageLoaded(true)
              }, 1000)
            }}
            src={url}
            alt={alt}
            style={imageStyle}
          />
        </div>
        {alt && <figcaption>{alt}</figcaption>}
      </div>
      {children}
    </figure>
  )
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

  const editor = useEditor()
  const selected = useSelected()
  const focused = useFocused()

  const [captionShow, setCaptionShow] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // test
  const [imageLoaded, setImageLoaded] = useState(false)

  const ref = useClickAway(() => setCaptionShow(false))
  const localImgRef = useRef()
  const imgRef = useRef()

  const { file, url, alt, id } = element
  const objectURL = useMemo(
    () => (file ? window.URL.createObjectURL(file) : ''),
    [file]
  )

  let cancelled = false
  const uploadImage = useCallback(() => {
    setLoading(true)
    setError(null)
    imageUploadRequest(file)
      .then((data) => {
        urls.set(id, data.url)
        onImageUploadSuccess?.(data)
        if (cancelled) return

        setError(null)
        const el = localImgRef.current
        setImageNode(editor, id, {
          url: data.url,
          width: el.naturalWidth,
          height: el.naturalHeight,
        })
      })
      .catch((err) => {
        onImageUploadError?.(err)
        if (!cancelled) {
          setError(err)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
  }, [
    imageUploadRequest,
    file,
    id,
    cancelled,
    onImageUploadSuccess,
    onImageUploadError,
  ])

  useEffect(() => {
    if (url) return
    if (!file) return

    if (urls.has(id)) {
      setLoading(false)
      // TODO: 不用setTimeout，则naturalWidth和height为0，why?
      setTimeout(() => {
        const el = localImgRef.current
        setImageNode(editor, id, {
          url: urls.get(id),
          width: el.naturalWidth,
          height: el.naturalHeight,
        })
      })
      return
    }

    uploadImage()

    return () => {
      cancelled = true
    }
  }, [id, url, file, uploadImage])

  return (
    <figure {...attributes}>
      <div
        ref={ref}
        contentEditable={false}
        style={{ textAlign: 'center', marginTop: 30, position: 'relative' }}
      >
        {file && (
          <img
            ref={localImgRef}
            className={cx(
              'placeholder',
              css`
                display: inline-block;
                width: 100%;
                height: auto;
                // cursor: move;
                box-shadow: ${selected && focused
                  ? '0 0 0 3px #B4D5FF'
                  : 'none'};
              `
            )}
            src={objectURL}
            alt={alt}
            onClick={(event) => {
              event.preventDefault()
              setCaptionShow(true)
            }}
          />
        )}
        {url && (
          <img
            ref={imgRef}
            onLoad={() => {
              objectURL && window.URL.revokeObjectURL(objectURL)
              setImageLoaded(true)

              const { width, height } = element
              const props = { file: undefined }
              if (width === undefined || height === undefined) {
                props.width = imgRef.current.naturalWidth
                props.height = imgRef.current.naturalHeight
              }
              setImageNode(editor, id, props)
            }}
            onClick={(event) => {
              event.preventDefault()
              setCaptionShow(true)
            }}
            onDragStart={(event) => {
              // COMPAT: 不要将type设为text or text/plain，因为第一次接受的时候chrome会输出\n\n
              // event.dataTransfer.setDragImage(el, 0, 0)
              event.dataTransfer.setData('image-id', id)
            }}
            onDrag={(event) => {
              //
            }}
            onDragEnd={(event) => {
              // event.preventDefault()
            }}
            // https://developer.mozilla.org/zh-CN/docs/Web/API/File/Using_files_from_web_applications
            src={url}
            alt={alt}
            className={cx(
              css`
              // opacity: ${imageLoaded ? 1 : 0};
              // transition: opacity 0.3s;
              // display: inline-block;
              display: ${imageLoaded ? 'inline-block' : 'none'};
              max-width: 100%;
              height: auto;
              cursor: move;
              box-shadow: ${selected && focused ? '0 0 0 3px #B4D5FF' : 'none'};
            `
            )}
          />
        )}
        {loading && <LoadingBar />}
        {error && <ErrorMask onError={uploadImage} />}
        {/* {error && <span style={{ color: 'red' }}>网络错误，稍后自动重试</span>}*/}
        <figcaption
          style={{
            opacity: !captionShow && alt === '' ? 0 : 1,
            transition: 'opacity 0.13s ease-in-out',
          }}
        >
          <CaptionInput
            caption={alt}
            onChange={(val) => {
              setCaptionShow(true)
              setImageNode(editor, id, { alt: val }, true)
            }}
            onEnter={() => {
              setCaptionShow(false)
              // https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/focus
              const path = ReactEditor.findPath(editor, element)
              // TODO: last的实现貌似有BUG...可以提交issue
              const [_, lastPath] = Editor.last(editor, path.slice(0, -1))

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
        </figcaption>
      </div>
      {children}
    </figure>
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
        multiple
        accept="image/*"
        ref={ref}
        style={{ display: 'none' }}
        onChange={() => {
          for (const file of ref.current.files) {
            insertImage(editor, file, '')
          }
          ref.current.value = ''
        }}
      />
    </Button>
  )
}

const CaptionInput = ({ caption, onChange, onEnter, ...rest }) => {
  return (
    <input
      {...rest}
      id="foo"
      placeholder="添加图片说明（可选）"
      onClick={(event) => event.stopPropagation()}
      // TODO: onKeyDown和onKeyUp的行为不一样...why?
      onKeyUp={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          onEnter()
        }
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
        // TODO: 默认的Ctrl + Z 无法撤销？ why?
        // if (Hotkeys.isUndo(event)) {
        // // what to do?
        // }
      }}
      value={caption}
      onChange={(event) => {
        event.stopPropagation()
        const newVal = event.target.value
        onChange(newVal)
      }}
    />
  )
}

const ErrorMask = (props) => {
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 27px;
        background-color: rgba(255, 255, 255, 0.63);
      `}
    >
      <div>
        <p
          className={css`
            padding-bottom: 15px;
            color: red !important;
          `}
        >
          上传出错
        </p>
        <button
          className={css`
            border: none;
            background: none;
            outline: none;
            font-size: 1.1em;
            cursor: pointer;
            color: #333;
          `}
          onClick={(event) => {
            event.preventDefault()
            props.onError()
          }}
        >
          重试
        </button>
      </div>
    </div>
  )
}

const setImageNode = (editor, id, props, saveHistory = false) => {
  const [match] = Editor.nodes(editor, {
    match: (node) => node.type === 'image' && node.id === id,
    at: [],
  })
  if (match) {
    if (saveHistory) {
      Transforms.setNodes(editor, props, { at: match[1] })
    } else {
      HistoryEditor.withoutSaving(editor, () => {
        Transforms.setNodes(editor, props, { at: match[1] })
      })
    }
  }
}

const insertImage = (editor, file, url, alt = '', el = null) => {
  const img = {
    type: 'image',
    id: randomString(),
    alt,
    children: [{ text: '' }],
  }
  if (url) img.url = url
  if (file) {
    if (!imageValidator.isValid(file)) {
      return
    } else {
      img.file = file
    }
  }
  Transforms.insertNodes(editor, img)
}

const isImageUrl = (url) => {
  if (!url) return false
  if (!isUrl(url)) return false
  const ext = new URL(url).pathname.split('.').pop()
  return imageExtensions.includes(ext)
}
