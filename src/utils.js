import { random, range } from 'lodash'

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

export const randomString = (length=6, type='all') => {
  const cs = CHAR_SETS[type]
  return range(length).map(() => cs.charAt(random(cs.length-1))).join('')
}
