import { useCallback, useRef } from 'react'
import { useTokenContext } from '../contexts/TokenContext'
import { generateAllTokens } from '../ts/generation/batchGenerator.js'
import { clearDataUrlCache } from '../components/TokenGrid/TokenCard'
import type { ProgressCallback, Token, TokenCallback } from '../ts/types/index.js'

export function useTokenGenerator() {
  const {
    characters,
    officialData,
    generationOptions,
    scriptMeta,
    setTokens,
    setIsLoading,
    setError,
    setGenerationProgress,
  } = useTokenContext()

  // Use a ref to accumulate tokens incrementally during generation
  const tokensRef = useRef<Token[]>([])
  // AbortController ref for cancelling in-flight generation
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateTokens = useCallback(
    async (externalProgressCallback?: ProgressCallback) => {
      if (characters.length === 0) {
        setError('No characters to generate tokens for')
        return
      }

      // Cancel any in-flight generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        setIsLoading(true)
        setError(null)
        setGenerationProgress({ current: 0, total: characters.length })
        
        // Reset tokens array for new generation
        tokensRef.current = []
        setTokens([])
        
        // Clear the data URL cache since we're regenerating tokens
        clearDataUrlCache()

        const progressCallback: ProgressCallback = (current, total) => {
          setGenerationProgress({ current, total })
          if (externalProgressCallback) {
            externalProgressCallback(current, total)
          }
        }

        // Incremental token callback - updates UI as tokens are generated
        const tokenCallback: TokenCallback = (token: Token) => {
          tokensRef.current = [...tokensRef.current, token]
          setTokens(tokensRef.current)
        }

        // Generate tokens with incremental updates and abort support
        await generateAllTokens(
          characters,
          generationOptions,
          progressCallback,
          scriptMeta || undefined,
          tokenCallback,
          signal,
          officialData
        )

        setError(null)
      } catch (err) {
        // Don't treat abort as an error
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('Token generation was cancelled')
          return
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate tokens'
        setError(errorMessage)
        console.error('Token generation error:', err)
      } finally {
        setIsLoading(false)
        setGenerationProgress(null)
        abortControllerRef.current = null
      }
    },
    [characters, officialData, generationOptions, scriptMeta, setTokens, setIsLoading, setError, setGenerationProgress]
  )

  // Cancel function for external use
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return { generateTokens, cancelGeneration }
}
