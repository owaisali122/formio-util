'use client'

import { useField } from '@payloadcms/ui'
import { FormBuilder } from 'kolea-shared-package'
import type { FormBuilderSchema } from 'kolea-shared-package'
import { getFormsListUrl } from '@/config/formio'

function FormBuilderField() {
  const { value, setValue } = useField<FormBuilderSchema>()

  return (
    <FormBuilder
      value={value}
      setValue={setValue as (schema: FormBuilderSchema) => void}
      formsListUrl={getFormsListUrl()}
    />
  )
}

export default FormBuilderField
