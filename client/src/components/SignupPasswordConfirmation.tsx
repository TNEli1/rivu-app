import { useEffect, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Control, UseFormSetError } from 'react-hook-form';

type Props = {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  passwordField: string;
  setError: UseFormSetError<any>;
};

/**
 * Password confirmation field component that provides real-time validation
 * to ensure passwords match during signup
 */
export function PasswordConfirmationField({
  control,
  name,
  label,
  description,
  passwordField,
  setError
}: Props) {
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [doPasswordsMatch, setDoPasswordsMatch] = useState(true);

  useEffect(() => {
    // Only validate once both fields have values
    if (passwordValue && confirmValue) {
      if (passwordValue !== confirmValue) {
        setDoPasswordsMatch(false);
        setError(name, {
          type: 'manual',
          message: 'Passwords do not match'
        });
      } else {
        setDoPasswordsMatch(true);
      }
    }
  }, [passwordValue, confirmValue, setError, name]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="password"
              {...field}
              onChange={(e) => {
                field.onChange(e);
                setConfirmValue(e.target.value);
              }}
              className={!doPasswordsMatch ? 'border-red-500' : ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type WatchProps = {
  control: Control<any>;
  name: string;
  setValue: (value: string) => void;
};

/**
 * Password watch component to track the original password value
 * Used with PasswordConfirmationField
 */
export function PasswordWatch({ control, name, setValue }: WatchProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          type="password"
          {...field}
          onChange={(e) => {
            field.onChange(e);
            setValue(e.target.value);
          }}
          style={{ display: 'none' }}
        />
      )}
    />
  );
}