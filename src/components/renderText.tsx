import React from 'react'
import MathBlock from './MathBlock'

export function renderText(text: string) {
  const normalized = text.replace(/\\n/g, '\n')
  const parts = normalized.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return <MathBlock key={idx} math={part.slice(1, -1)} inline={true} />
        }
        return (
          <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </span>
        )
      })}
    </>
  )
}


