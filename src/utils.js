import { random, range } from 'lodash'
import { useRef, useEffect, useCallback } from 'react'

export const digits = '0123456789'
export const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const lowers = 'abcdefghijklmnopqrstuvwxyz'
export const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const uppersDigits = uppers + digits
export const lowersDigits = lowers + digits
export const all = letters + digits

export const CHAR_SETS = {
  digits,
  letters,
  lowers,
  uppers,
  uppersDigits,
  lowersDigits,
  all,
}

export const randomString = (length = 6, type = 'all') => {
  const cs = CHAR_SETS[type]
  return range(length)
    .map(() => cs.charAt(random(cs.length - 1)))
    .join('')
}

export const truncateLeft = (text, limit) => {
  return text.length <= limit ? text : text.substr(text.length - limit)
}

export const compose = (...funcs) =>
  funcs.reduce((acc, func) => (...args) => acc(func(...args)))

export const useClickAway = (onClickAway, dom) => {
  const element = useRef()

  const handler = useCallback(
    (event) => {
      const targetElement = typeof dom === 'function' ? dom() : dom
      const el = targetElement || element.current
      if (!el || el.contains(event.target)) {
        return
      }
      onClickAway(event)
    },
    [element.current, onClickAway, dom]
  )

  useEffect(() => {
    document.addEventListener('click', handler)
    return () => {
      document.removeEventListener('click', handler)
    }
  }, [handler])

  return element
}

export const assignIfNotUndefined = (obj1, obj2) => {
  for (const [k, v] of Object.entries(obj2)) {
    if (v !== undefined) {
      obj1[k] = v
    }
  }
  return obj1
}

export const imageValidator = {
  maxImageSize: 1024 * 1024 * 5,
  onImageExceedMaxSize: () => {},

  allowedImageTypes: 'png jpg jpeg gif',
  onInvalidImageTypes: () => {},

  isValid(file) {
    const { size, type } = file
    let valid = true
    if (size >= this.maxImageSize) {
      valid = false
      this.onImageExceedMaxSize(file)
    }
    if (!this.allowedImageTypes.includes(type.split('/').pop().toLowerCase())) {
      valid = false
      this.onInvalidImageTypes(file)
    }
    return valid
  },
}
