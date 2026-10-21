import React from 'react';
import { useForm } from 'react-hook-form';
import { useFormContext } from '../contexts/FormContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';
import type { EligibilityFormData } from '../types';

interface EligibilityForm {
  eligibility_category: string;
  eligibility_details: string;
  supporting_document: string;
}

export const EligibilityDetailsPage: React.FC = () => {
  const { formState, updateEligibility, markStepComplete, setCurrentStep } = useFormContext();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EligibilityForm>({
    defaultValues: formState.eligibility,
  });

  const onSubmit = async (data: EligibilityForm) => {
    updateEligibility(data as Partial<EligibilityFormData>);
    markStepComplete(3);
    setCurrentStep(4);
    toast.success('Eligibility saved');
    navigate('/app/contact');
  };

  const categories = [
    'Low income / financially weaker section',
    'Women, including relevant domestic violence cases',
    'Children',
    'Senior citizens',
    'Persons with disabilities',
    'Members of Scheduled Castes (SC)',
    'Members of Scheduled Tribes (ST)',
    'Victims of trafficking or labour exploitation',
    'Other / state-specific eligibility category',
    'Not sure / need assistance identifying the applicable category',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={3} />
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-serif text-center mb-4">Eligibility Details</h2>
          <div>
            <label className="label-base" htmlFor="eligibility_category">Eligibility Category<span className="required-star">*</span></label>
            <select id="eligibility_category" className={`input-base ${errors.eligibility_category ? 'input-error' : ''}`} {...register('eligibility_category', { required: true })}>
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.eligibility_category && <p className="text-crimson-500 text-sm mt-1">Category required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="eligibility_details">Eligibility Details (optional)</label>
            <textarea id="eligibility_details" rows={4} className="input-base" {...register('eligibility_details')} />
          </div>
          <div>
            <label className="label-base" htmlFor="supporting_document">Supporting Document Available?<span className="required-star">*</span></label>
            <select id="supporting_document" className={`input-base ${errors.supporting_document ? 'input-error' : ''}`} {...register('supporting_document', { required: true })}>
              <option value="">Select</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
              <option value="unsure">unsure</option>
            </select>
            {errors.supporting_document && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div className="flex justify-between mt-4">
            <Button type="submit" variant="primary" loading={isSubmitting}>Next</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
