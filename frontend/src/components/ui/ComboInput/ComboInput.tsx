import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export interface ComboOption {
  id: number
  label: string
}

interface Props {
  label: string
  options: ComboOption[]
  value: ComboOption | null
  onChange: (val: ComboOption | null) => void
  disabled?: boolean
  placeholder?: string
  size?: 'small' | 'medium'
  fullWidth?: boolean
}

export function ComboInput({
  label,
  options,
  value,
  onChange,
  disabled,
  placeholder,
  size = 'small',
  fullWidth = true,
}: Props) {
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, newVal) => onChange(newVal)}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      disabled={disabled}
      disablePortal
      slotProps={{
        listbox: { style: { maxHeight: 220, overflowY: 'auto' } },
        popper: {
          placement: 'bottom-start',
          modifiers: [{ name: 'flip', enabled: false }],
          style: { zIndex: 1400 },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size={size}
          fullWidth={fullWidth}
          placeholder={placeholder}
        />
      )}
    />
  )
}
