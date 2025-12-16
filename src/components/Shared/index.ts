// Shared Components

// UI Components (from UI/ subdirectory)
export { Button, ToggleButton, ButtonGroup, type ButtonVariant, type ButtonSize } from './UI/Button'
export { Alert, type AlertVariant } from './UI/Alert'
export { ToastContainer } from './UI/Toast'
export { ContextMenu, type ContextMenuItem, type ContextMenuProps } from './UI/ContextMenu'
export { OptionGroup } from './UI/OptionGroup'
export { SegmentedControl } from './UI/SegmentedControl'

// Modal System (from ModalBase/ subdirectory)
export { Modal, type ModalProps, type ModalSize } from './ModalBase'
export { ConfirmDialog, type ConfirmDialogProps } from './ModalBase'

// Form Components
export {
  Input,
  Select,
  Checkbox,
  Textarea,
  FormGroup,
  type InputProps,
  type SelectProps,
  type SelectOption,
  type CheckboxProps,
  type TextareaProps,
  type FormGroupProps,
} from './Form'

// Preview Selector Components (unified "box" pattern)
export { AssetPreviewSelector, type AssetPreviewSelectorProps } from './Selectors/AssetPreviewSelector'
export { ColorPreviewSelector, type ColorPreviewSelectorProps, type ColorPreset } from './Selectors/ColorPreviewSelector'
export { FontPreviewSelector, type FontPreviewSelectorProps } from './Selectors/FontPreviewSelector'
export {
  FontSettingsSelector,
  type FontSettingsSelectorProps,
  type FontSettings,
  type FontOption,
} from './Selectors/FontSettingsSelector'
export {
  IconSettingsSelector,
  type IconSettingsSelectorProps,
  type IconSettings,
} from './Selectors/IconSettingsSelector'
export {
  UnifiedSettingsBox,
  type UnifiedSettingsBoxProps,
  type BoxMode,
  type ToggleConfig,
  type PreviewConfig,
} from './Selectors/UnifiedSettingsBox'

// Settings Selector Base (unified pattern)
export {
  SettingsSelectorBase,
  PreviewBox,
  InfoSection,
  ToggleGroup,
  EnableToggle,
  type SettingsSelectorBaseProps,
  type PreviewBoxProps,
  type InfoSectionProps,
  type ToggleOption,
  type ToggleGroupProps,
  type EnableToggleProps,
} from './Selectors/SettingsSelectorBase'
export {
  AccentSettingsSelector,
  type AccentSettingsSelectorProps,
} from './Selectors/AccentSettingsSelector'
export { GenerateVariantsSelector } from './Selectors/GenerateVariantsSelector'
export { MetaTokensSelector } from './Selectors/MetaTokensSelector'
export { ReminderCountSelector } from './Selectors/ReminderCountSelector'
export { SetupSettingsSelector } from './Selectors/SetupSettingsSelector'

// Feedback Components (from Feedback/ subdirectory)
export { AutoSaveIndicator } from './Feedback/AutoSaveIndicator'
export { AutoSaveToggle } from './Feedback/AutoSaveToggle'
export { SyncProgressBar } from './Feedback/SyncProgressBar'
export { SyncStatusIndicator } from './Feedback/SyncStatusIndicator'
export { StorageWarning } from './Feedback/StorageWarning'

// JSON Components (from Json/ subdirectory)
export { JsonEditorPanel } from './Json/JsonEditorPanel'
export { VirtualizedJsonHighlight } from './Json/VirtualizedJsonHighlight'

// Assets Components (from Assets/ subdirectory)
export { AssetThumbnail } from './Assets/AssetThumbnail'
export { SaveAsNewProjectButton } from './Assets/SaveAsNewProjectButton'

// Control Components (from Controls/ subdirectory)
export { IconUploader } from './Controls/IconUploader'
export { ImageSelector, type ImageSelectorShape } from './Controls/ImageSelector'
export { SliderWithValue } from './Controls/SliderWithValue'
export { MeasurementSlider } from './Controls/MeasurementSlider'
export { FileDropzone } from './Controls/FileDropzone'

// Options Panel Components (from Options/ subdirectory)
export { AdditionalOptionsPanel } from './Options/AdditionalOptionsPanel'
export { AppearancePanel } from './Options/AppearancePanel'
export { CharacterTab } from './Options/CharacterTab'
export { OptionsPanel } from './Options/OptionsPanel'
export { ReminderTab } from './Options/ReminderTab'
