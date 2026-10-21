import React from 'react';
import { useForm } from 'react-hook-form';
import { useFormContext } from '../contexts/FormContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';

interface LegalIssueForm {
  issue_type: string;
  description: string;
  court_case_in_progress: '' | 'yes' | 'no' | 'unsure';
  court_deadline: string;
  urgency: '' | 'normal' | 'urgent';
}

export const LegalIssueDetailsPage: React.FC = () => {
  const { formState, updateLegalIssue, markStepComplete, setCurrentStep } = useFormContext();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LegalIssueForm>({
    defaultValues: formState.legal_issue,
  });

  const deadline = watch('court_deadline');

  const onSubmit = async (data: LegalIssueForm) => {
    updateLegalIssue(data);
    markStepComplete(2);
    setCurrentStep(3);
    toast.success('Legal issue saved');
    navigate('/app/eligibility');
  };

  const isUrgent = deadline && (new Date(deadline).getTime() - Date.now()) / (1000*60*60*24) <= 3;

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={2} />
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-serif text-center mb-4">Legal Issue Details</h2>
          <div>
            <label className="label-base" htmlFor="issue_type">Issue Type<span className="required-star">*</span></label>
            <select id="issue_type" className={`input-base ${errors.issue_type ? 'input-error' : ''}`} {...register('issue_type', { required: true })}>
              <option value="">Select Issue</option>
              <option>Family and matrimonial disputes</option>
              <option>Domestic violence</option>
              <option>Employment and labour disputes</option>
              <option>Property and land disputes</option>
              <option>Consumer complaints</option>
              <option>Criminal matters</option>
              <option>Civil disputes</option>
              <option>Accident compensation</option>
              <option>Pension and social welfare issues</option>
              <option>Other / Not sure</option>
            </select>
            {errors.issue_type && <p className="text-crimson-500 text-sm mt-1">Issue type required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="description">Brief Description</label>
            <textarea id="description" rows={4} className="input-base" {...register('description')} />
          </div>
          <div>
            <label className="label-base" htmlFor="court_case_in_progress">Court case in progress?<span className="required-star">*</span></label>
            <select id="court_case_in_progress" className={`input-base ${errors.court_case_in_progress ? 'input-error' : ''}`} {...register('court_case_in_progress', { required: true })}>
              <option value="">Select</option>
              <option>yes</option>
              <option>no</option>
              <option>unsure</option>
            </select>
            {errors.court_case_in_progress && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="court_deadline">Court deadline (optional)</label>
            <input type="date" id="court_deadline" className="input-base" {...register('court_deadline')} />
            {isUrgent && <p className="text-crimson-500 text-sm mt-1">Urgent! Deadline within 3 days.</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="urgency">Urgency<span className="required-star">*</span></label>
            <select id="urgency" className={`input-base ${errors.urgency ? 'input-error' : ''}`} {...register('urgency', { required: true })}>
              <option value="">Select</option>
              <option>normal</option>
              <option>urgent</option>
            </select>
            {errors.urgency && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div className="flex justify-between mt-4">
            <Button type="submit" variant="primary" loading={isSubmitting}>Next</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
