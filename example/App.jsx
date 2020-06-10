import React from 'react'
import {css} from 'emotion'
import Slator from '../src/slator'

const App = () => {
  return (
    <div className={css`
      margin-top: 30px;
      margin-left: auto;
      margin-right: auto;
      max-width: 1000px;
    `}>
      <Slator />
    </div>
  )
}

export default App
