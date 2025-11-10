import katex from 'katex'
import React from 'react'

export default function MathBlock({ math, inline = false }: { math: string, inline?: boolean }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(math, { displayMode: !inline, throwOnError: false })
    } catch {
      return math
    }
  }, [math, inline])
  
  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}


