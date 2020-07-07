# Slator: a rich text editor based on slate

## Install

...

## About

## Bugs of slate

* IME issue: select and type with IME will crash the editor
  https://github.com/ianstormtaylor/slate/pull/3374 (this solves the issue but introduces another)

* IME issue: type with IME when placeholder exists will crash the editor

* Double-click will select the next void block element (the focus's offset is 1), 
  and then convert the selected content to a block element will crash the editor
  (safari does not have this problem) - https://github.com/ianstormtaylor/slate/pull/3374
  
* Double-click will select the next block element in chrome and safari (firefox has done a good job)


...
