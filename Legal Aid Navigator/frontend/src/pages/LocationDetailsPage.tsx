import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useFormContext } from '../contexts/FormContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';

interface LocationForm {
  country: string;
  state: string;
  district: string;
  city: string;
  pin_code: string;
}

// Simple static data for India (states & districts) – in real app this would be fetched
import { indiaData } from '../data/indiaLocations';

export const LocationDetailsPage: React.FC = () => {
  const { formState, updateLocation, markStepComplete, setCurrentStep } = useFormContext();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LocationForm>({
    defaultValues: { ...formState.location, country: formState.location.country || 'India' },
  });

  const selectedState = watch('state');

  const onSubmit = async (data: LocationForm) => {
    updateLocation(data);
    markStepComplete(1);
    setCurrentStep(2);
    toast.success('Location saved');
    navigate('/app/legal-issue');
  };

  // Reset district when state changes
  useEffect(() => {
    if (selectedState) {
      // clear district if it doesn't belong to new state
      const districts = (indiaData.states as Record<string, string[]>)[selectedState] || [];
      if (!districts.includes(formState.location.district)) {
        updateLocation({ district: '' });
      }
    }
  }, [selectedState]);

  const states = Object.keys(indiaData.states);
  const districts = selectedState ? (indiaData.states as Record<string, string[]>)[selectedState] : [];

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={1} />
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-serif text-center mb-4">Location Details</h2>
          <div>
            <label className="label-base" htmlFor="country">Country<span className="required-star">*</span></label>
            <select id="country" className={`input-base ${errors.country ? 'input-error' : ''}`} {...register('country', { required: true })}>
              <option value="India">India</option>
            </select>
            {errors.country && <p className="text-crimson-500 text-sm mt-1">Country is required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="state">State<span className="required-star">*</span></label>
            <select id="state" className={`input-base ${errors.state ? 'input-error' : ''}`} {...register('state', { required: true })}>
              <option value="">Select State</option>
              {states.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            {errors.state && <p className="text-crimson-500 text-sm mt-1">State is required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="district">District<span className="required-star">*</span></label>
            <select id="district" className={`input-base ${errors.district ? 'input-error' : ''}`} {...register('district', { required: true })}>
              <option value="">Select District</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.district && <p className="text-crimson-500 text-sm mt-1">District is required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="city">City / Town / Village</label>
            <input id="city" type="text" className="input-base" {...register('city')} />
          </div>
          <div>
            <label className="label-base" htmlFor="pin_code">PIN Code</label>
            <input id="pin_code" type="text" className="input-base" {...register('pin_code')} />
          </div>
          <div className="flex justify-between mt-4">
            <Button type="submit" variant="primary" loading={isSubmitting}>Next</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
