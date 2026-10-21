import React from 'react';
import { useForm } from 'react-hook-form';
import { useFormContext } from '../contexts/FormContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';

interface ContactForm {
  full_name: string;
  mobile_number: string;
  email: string;
  preferred_contact: '' | 'phone' | 'email' | 'sms';
  consultation_mode: '' | 'in_person' | 'phone' | 'video';
}

export const ContactDetailsPage: React.FC = () => {
  const { formState, updateContact, markStepComplete, setCurrentStep } = useFormContext();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    defaultValues: formState.contact,
  });

  const onSubmit = async (data: ContactForm) => {
    updateContact(data);
    markStepComplete(4);
    setCurrentStep(5);
    toast.success('Contact details saved');
    navigate('/app/appointment');
  };

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={4} />
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-serif text-center mb-4">Contact Details</h2>
          <div>
            <label className="label-base" htmlFor="full_name">Full Name<span className="required-star">*</span></label>
            <input id="full_name" className={`input-base ${errors.full_name ? 'input-error' : ''}`} {...register('full_name', { required: true })} />
            {errors.full_name && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="mobile_number">Mobile Number<span className="required-star">*</span></label>
            <input id="mobile_number" type="tel" className={`input-base ${errors.mobile_number ? 'input-error' : ''}`} {...register('mobile_number', { required: true, pattern: /^[0-9]{10,15}$/ })} />
            {errors.mobile_number && <p className="text-crimson-500 text-sm mt-1">Enter a valid number</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="email">Email<span className="required-star">*</span></label>
            <input id="email" type="email" className={`input-base ${errors.email ? 'input-error' : ''}`} {...register('email', { required: true })} />
            {errors.email && <p className="text-crimson-500 text-sm mt-1">Valid email required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="preferred_contact">Preferred Contact Method<span className="required-star">*</span></label>
            <select id="preferred_contact" className={`input-base ${errors.preferred_contact ? 'input-error' : ''}`} {...register('preferred_contact', { required: true })}>
              <option value="">Select</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            {errors.preferred_contact && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="consultation_mode">Consultation Mode<span className="required-star">*</span></label>
            <select id="consultation_mode" className={`input-base ${errors.consultation_mode ? 'input-error' : ''}`} {...register('consultation_mode', { required: true })}>
              <option value="">Select</option>
              <option value="in_person">In‑person</option>
              <option value="phone">Phone</option>
              <option value="video">Video</option>
            </select>
            {errors.consultation_mode && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div className="flex justify-between mt-4">
            <Button type="submit" variant="primary" loading={isSubmitting}>Next</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
