import MathBlock from './MathBlock'

export function renderText(text: string) {
  // Normalize escaped newlines from API (e.g., "\\n") to actual newlines
  const normalized = text.replace(/\\n/g, '\n')
  
  // Split by newlines first to handle line breaks
  const lines = normalized.split('\n')
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Process each line for math blocks
        const parts = line.split(/(\$[^$]+\$)/g)
        
        return (
          <span key={`line-${lineIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, partIdx) => {
              const uniqueKey = `line-${lineIdx}-part-${partIdx}`
              if (part.startsWith('$') && part.endsWith('$')) {
                return <MathBlock key={uniqueKey} math={part.slice(1, -1)} inline={true} />
              }
              return <span key={uniqueKey}>{part}</span>
            })}
            {lineIdx < lines.length - 1 && <br key={`br-${lineIdx}`} />}
          </span>
        )
      })}
    </>
  )
}


