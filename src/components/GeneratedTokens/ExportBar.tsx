import { useTokenContext } from '../../contexts/TokenContext'
import { useExport } from '../../hooks/useExport'
import { useToast } from '../../contexts/ToastContext'
import styles from '../../styles/components/generatedTokens/ExportBar.module.css'

export function ExportBar() {
  const { tokens } = useTokenContext()
  const { downloadZip, downloadPdf, cancelExport, isExporting, exportProgress, exportStep } = useExport()
  const { addToast } = useToast()

  // Don't show if no tokens generated
  if (tokens.length === 0) {
    return null
  }

  const handleDownloadZip = async () => {
    try {
      await downloadZip()
      addToast('ZIP file downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to create ZIP: ${message}`, 'error')
    }
  }

  const handleDownloadPdf = async () => {
    try {
      await downloadPdf()
      addToast('PDF downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to generate PDF: ${message}`, 'error')
    }
  }

  const getButtonText = (type: 'zip' | 'pdf') => {
    if (!isExporting) {
      return type === 'zip' ? 'Download ZIP' : 'Download PDF'
    }
    if (exportProgress) {
      return `${exportProgress.current}/${exportProgress.total}`
    }
    return 'Exporting...'
  }

  // Calculate progress percentage
  const progressPercentage = exportProgress 
    ? Math.round((exportProgress.current / exportProgress.total) * 100) 
    : 0

  return (
    <div className={styles.bar}>
      <div className={styles.tokenCount}>
        {tokens.length} token{tokens.length !== 1 ? 's' : ''} generated
      </div>
      
      {/* Progress bar - always visible */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={`${styles.progressFill} ${isExporting && !exportProgress ? styles.indeterminate : ''}`}
            style={{ width: isExporting && exportProgress ? `${progressPercentage}%` : '0%' }}
          />
        </div>
        <span className={styles.progressText}>
          {isExporting
            ? (exportProgress 
                ? `${exportProgress.current}/${exportProgress.total} (${progressPercentage}%)`
                : 'Processing...')
            : 'Ready'
          }
        </span>
        {isExporting && exportStep && (
          <span className={styles.stepLabel}>
            {exportStep === 'zip' && 'Creating ZIP...'}
            {exportStep === 'pdf' && 'Generating PDF...'}
            {exportStep === 'json' && 'Saving JSON...'}
            {exportStep === 'style' && 'Saving Style...'}
          </span>
        )}
        {isExporting && (
          <button
            className={styles.cancelBtn}
            onClick={cancelExport}
            title="Cancel export"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className={styles.content}>
        <button
          className={styles.primaryBtn}
          onClick={handleDownloadZip}
        >
          <span className={styles.icon}>📦</span>
          {getButtonText('zip')}
        </button>
        <button
          className={styles.secondaryBtn}
          onClick={handleDownloadPdf}
        >
          <span className={styles.icon}>📄</span>
          {getButtonText('pdf')}
        </button>
      </div>
    </div>
  )
}
