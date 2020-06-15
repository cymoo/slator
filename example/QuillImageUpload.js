import Quill from 'quill'

// image upload parchment
const BlockEmbed = Quill.import('blots/block/embed')

export class ImageUploadBlot extends BlockEmbed {
  static create(value) {
    const node = super.create()
    node.setAttribute('src', value.url)
    node.setAttribute('id', value.id)
    return node
  }

  static value(node) {
    return {
      url: node.getAttribute('src'),
    }
  }
}

ImageUploadBlot.blotName = 'image-upload'
ImageUploadBlot.tagName = 'img'

Quill.register(ImageUploadBlot)

// image upload module
export default class ImageUpload {
  constructor(editor, options) {
    this.editor = editor
    this.options = options
    const toolbar = editor.getModule('toolbar')
    toolbar.addHandler('image', this.selectImage)
  }

  selectImage = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('multiple', true)
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = () => {
      for (const file of Array.from(input.files).slice(
        0,
        this.options.maxImages
      )) {
        if (!this.isValidImageFile(file)) {
          continue
        }
        this.uploadImage(file)
      }
      input.value = ''
    }
  }

  isValidImageFile = (file) => {
    const { allowedImageTypes, maxImageSize } = this.options
    const { size, type } = file
    return (
      size <= maxImageSize && allowedImageTypes.includes(type.split('/').pop())
    )
  }

  _imageID = 1
  uploadImage = (file) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const id = String(this._imageID)
      this._imageID += 1
      this.insertImage({ id, url: reader.result })

      const {
        imageUploadRequest,
        onImageUploadError,
        onImageUploadSuccess,
      } = this.options

      imageUploadRequest()
        .then((data) => {
          const img = document.getElementById(id)
          img.setAttribute('src', data.url)
          img.removeAttribute('id')

          if (typeof onImageUploadSuccess == 'function') {
            onImageUploadSuccess(data)
          }
        })
        .catch((err) => {
          if (typeof onImageUploadError == 'function') {
            onImageUploadError(err)
          }
        })
    }
  }

  insertImage = (value) => {
    const editor = this.editor
    const range = editor.getSelection(true)
    editor.insertText(range.index, '\n', Quill.sources.USER)
    editor.insertEmbed(
      range.index + 1,
      'image-upload',
      value,
      Quill.sources.USER
    )
    editor.setSelection(range.index + 2, Quill.sources.SILENT)
  }
}
