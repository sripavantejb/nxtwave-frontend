import MathBlock from './MathBlock'

export function renderText(text: string) {
  if (!text) return null
  
  // Normalize escaped newlines from API (e.g., "\\n") to actual newlines
  let normalized = text.replace(/\\n/g, '\n')
  
  // First, remove \n characters from inside LaTeX blocks (between $ markers)
  // This must be done BEFORE splitting by newlines to preserve LaTeX blocks
  normalized = normalized.replace(/\$([^$]*)\$/g, (_match, latexContent) => {
    // Remove all newlines from LaTeX content and replace with spaces
    const cleanedLatex = latexContent.replace(/\n/g, ' ')
    return `$${cleanedLatex}$`
  })
  
  // Now split by newlines for regular text formatting
  const lines = normalized.split('\n')
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Process each line for math blocks - match $...$ patterns
        const parts = line.split(/(\$[^$]*\$)/g).filter(part => part !== '')
        
        return (
          <span key={`line-${lineIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, partIdx) => {
              const uniqueKey = `line-${lineIdx}-part-${partIdx}`
              // Check if this part is a LaTeX expression (starts and ends with $)
              if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                // KaTeX doesn't support the Unicode Rupee symbol.
                // Replace it inside LaTeX segments to prevent console warnings.
                const mathContent = part.slice(1, -1).trim().replace(/₹/g, 'Rs.')
                // Only render as math if there's actual content
                if (mathContent) {
                  return <MathBlock key={uniqueKey} math={mathContent} inline={true} />
                }
              }
              // Render as regular text (preserves all text content)
              return <span key={uniqueKey}>{part}</span>
            })}
            {lineIdx < lines.length - 1 && <br key={`br-${lineIdx}`} />}
          </span>
        )
      })}
    </>
  )
}


