import React from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'
import PropTypes from 'prop-types'

import './index.css'

import QuillImageUpload from './QuillImageUpload'

Quill.register('modules/imageUpload', QuillImageUpload)

export default class QuillEditor extends React.Component {
  static propTypes = {
    allowedImageTypes: PropTypes.arrayOf(PropTypes.string),

    imageUploadRequest: PropTypes.func.isRequired,

    maxImageSize: PropTypes.number,
    maxImages: PropTypes.number,

    onChange: PropTypes.func.isRequired,
    onChangeSelection: PropTypes.func,

    onImageUploadError: PropTypes.func,
    onImageUploadSuccess: PropTypes.func,

    theme: PropTypes.string,
  }
  static defaultProps = {
    theme: 'snow',
    allowedImageTypes: ['png', 'jpg', 'jpeg'],
    maxImageSize: 1024 * 1024 * 2,
    maxImages: 5,
  }

  editor = null
  ref = React.createRef()

  componentDidMount() {
    const {
      theme,
      imageUploadRequest,
      onImageUploadError,
      onImageUploadSuccess,
      allowedImageTypes,
      maxImageSize,
      maxImages,
    } = this.props

    const toolbarOptions = [
      ['bold', 'italic', 'underline'],
      ['blockquote', 'code-block'],

      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['image', 'link'],
    ]

    const options = {
      debug: 'warn',
      modules: {
        toolbar: toolbarOptions,
        imageUpload: {
          imageUploadRequest,
          onImageUploadError,
          onImageUploadSuccess,
          allowedImageTypes,
          maxImageSize,
          maxImages,
        },
      },
      placeholder: 'how can we live without a story to tell',
      theme,
    }

    this.editor = new Quill(this.ref.current, options)
    this.editor.on('text-change', this.handleChange)
    this.changeDefaultLinkPlaceholder()
  }

  componentWillUnmount() {
    this.editor.off('text-change', this.handleChange)
  }

  handleChange = () => {
    const { onChange } = this.props
    if (typeof onChange === 'function') {
      onChange(this.editor.root.innerHTML)
    }
  }

  changeDefaultLinkPlaceholder = (placeholder = 'https://') => {
    const input = document.querySelector(
      'input[data-link="https://quilljs.com"]'
    )
    if (input) {
      input.setAttribute('data-link', placeholder)
    }
  }

  render() {
    return <div ref={this.ref} className="editor" />
  }
}
