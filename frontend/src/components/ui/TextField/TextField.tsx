// src/components/atoms/TextField/TextField.tsx
import MuiTextField, { TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';

interface TextFieldProps<T extends FieldValues> extends Omit<MuiTextFieldProps, 'name'> {
  name: Path<T>;
  control: Control<T>;
}

export const TextField = <T extends FieldValues>({
  name,
  control,
  fullWidth = true,
  variant = 'outlined',
  onChange, // Terima custom onChange jika perlu
  ...props
}: TextFieldProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange: fieldOnChange, ...field }, fieldState: { error } }) => (
        <MuiTextField
          {...field}
          {...props}
          fullWidth={fullWidth}
          variant={variant}
          error={!!error}
          helperText={error?.message || props.helperText}
          value={field.value ?? ''}
          // Gunakan custom onChange jika ada, jika tidak gunakan standar field.onChange
          onChange={(e) => {
            fieldOnChange(e);
            if (onChange) onChange(e);
          }}
        />
      )}
    />
  );
};