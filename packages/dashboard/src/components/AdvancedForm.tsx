import React, { useState, useCallback, useMemo } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  helpText?: string;
  className?: string;
}

export interface FormData {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string;
}

interface AdvancedFormProps {
  fields: FormField[];
  initialData?: FormData;
  onSubmit: (data: FormData) => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  className?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function AdvancedForm({
  fields,
  initialData = {},
  onSubmit,
  onCancel,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  className = '',
  validateOnChange = true,
  validateOnBlur = true,
}: AdvancedFormProps) {
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  // Validation function
  const validateField = useCallback((field: FormField, value: any): string | null => {
    const { validation, required } = field;

    if (required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

    if (!validation || !value) return null;

    const { min, max, minLength, maxLength, pattern, custom } = validation;

    if (min !== undefined && Number(value) < min) {
      return `${field.label} must be at least ${min}`;
    }

    if (max !== undefined && Number(value) > max) {
      return `${field.label} must be at most ${max}`;
    }

    if (minLength !== undefined && String(value).length < minLength) {
      return `${field.label} must be at least ${minLength} characters`;
    }

    if (maxLength !== undefined && String(value).length > maxLength) {
      return `${field.label} must be at most ${maxLength} characters`;
    }

    if (pattern && !pattern.test(String(value))) {
      return `${field.label} format is invalid`;
    }

    if (custom) {
      return custom(value);
    }

    return null;
  }, []);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, data[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, data, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));

    if (validateOnChange) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({
          ...prev,
          [fieldName]: error || '',
        }));
      }
    }
  }, [fields, validateField, validateOnChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched(prev => new Set([...prev, fieldName]));

    if (validateOnBlur) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, data[fieldName]);
        setErrors(prev => ({
          ...prev,
          [fieldName]: error || '',
        }));
      }
    }
  }, [fields, data, validateField, validateOnBlur]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched(new Set(fields.map(f => f.name)));
    
    if (validateForm()) {
      try {
        await onSubmit(data);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
  }, [data, fields, validateForm, onSubmit]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((fieldName: string) => {
    setShowPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  }, []);

  // Render field
  const renderField = useCallback((field: FormField) => {
    const hasError = touched.has(field.name) && errors[field.name];
    const isPassword = field.type === 'password';
    const showPassword = showPasswords.has(field.name);

    const inputClasses = `
      w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent
      ${hasError 
        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      }
      ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      text-gray-900 dark:text-white
      ${field.className || ''}
    `.trim();

    const labelClasses = `
      block text-sm font-medium mb-1
      ${hasError ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
    `.trim();

    const renderInput = () => {
      switch (field.type) {
        case 'textarea':
          return (
            <textarea
              id={field.name}
              name={field.name}
              value={data[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={inputClasses}
              rows={4}
            />
          );

        case 'select':
          return (
            <select
              id={field.name}
              name={field.name}
              value={data[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              disabled={field.disabled}
              className={inputClasses}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options?.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          );

        case 'checkbox':
          return (
            <div className="flex items-center">
              <input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={Boolean(data[field.name])}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                onBlur={() => handleFieldBlur(field.name)}
                disabled={field.disabled}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
              <label htmlFor={field.name} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {field.label}
              </label>
            </div>
          );

        case 'radio':
          return (
            <div className="space-y-2">
              {field.options?.map(option => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`${field.name}-${option.value}`}
                    name={field.name}
                    value={option.value}
                    checked={data[field.name] === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    onBlur={() => handleFieldBlur(field.name)}
                    disabled={field.disabled || option.disabled}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                  />
                  <label
                    htmlFor={`${field.name}-${option.value}`}
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          );

        default:
          return (
            <div className="relative">
              <input
                type={isPassword && !showPassword ? 'password' : field.type}
                id={field.name}
                name={field.name}
                value={data[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                onBlur={() => handleFieldBlur(field.name)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={inputClasses}
                min={field.validation?.min}
                max={field.validation?.max}
                minLength={field.validation?.minLength}
                maxLength={field.validation?.maxLength}
                pattern={field.validation?.pattern?.source}
              />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(field.name)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          );
      }
    };

    return (
      <div key={field.name} className="space-y-1">
        {field.type !== 'checkbox' && field.type !== 'radio' && (
          <label htmlFor={field.name} className={labelClasses}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {renderInput()}
        
        {field.helpText && !hasError && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
        )}
        
        {hasError && (
          <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{errors[field.name]}</span>
          </div>
        )}
      </div>
    );
  }, [data, errors, touched, showPasswords, handleFieldChange, handleFieldBlur, togglePasswordVisibility]);

  const isFormValid = useMemo(() => {
    return fields.every(field => !validateField(field, data[field.name]));
  }, [fields, data, validateField]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        {fields.map(renderField)}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {submitText}
            </>
          )}
        </button>
      </div>
    </form>
  );
}