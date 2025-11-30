import { ReactNode } from 'react'
import styles from '../../styles/components/shared/OptionGroup.module.css'

interface OptionGroupProps {
  label: string
  description?: string
  helpText?: string
  children: ReactNode
  isSlider?: boolean
}

export function OptionGroup({ label, description, helpText, children, isSlider }: OptionGroupProps) {
  const tooltipText = description || helpText
  
  if (isSlider) {
    return (
      <div className={`${styles.group} ${styles.groupSlider}`}>
        <div className={styles.sliderHeader}>
          <span 
            className={styles.label}
            data-tooltip={tooltipText}
          >
            {label}
          </span>
          {children}
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.group}>
      <span 
        className={styles.label}
        data-tooltip={tooltipText}
      >
        {label}
      </span>
      <div className={styles.control}>
        {children}
      </div>
    </div>
  )
}
