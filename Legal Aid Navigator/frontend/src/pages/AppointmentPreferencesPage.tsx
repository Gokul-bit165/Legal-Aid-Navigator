import React from 'react';
import { useForm } from 'react-hook-form';
import { useFormContext } from '../contexts/FormContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';

interface AppointmentForm {
  preferred_date: string;
  preferred_time_slot: string;
  consultation_mode: '' | 'in_person' | 'phone' | 'video';
  alt_date: string;
  alt_time_slot: string;
  additional_notes: string;
}

export const AppointmentPreferencesPage: React.FC = () => {
  const { formState, updateAppointment, markStepComplete, setCurrentStep } = useFormContext();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AppointmentForm>({
    defaultValues: formState.appointment,
  });

  const onSubmit = async (data: AppointmentForm) => {
    updateAppointment(data);
    markStepComplete(5);
    setCurrentStep(6);
    toast.success('Appointment preferences saved');
    navigate('/app/consent');
  };

  const timeSlots = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={5} />
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-serif text-center mb-4">Appointment Preferences</h2>
          <div>
            <label className="label-base" htmlFor="preferred_date">Preferred Date<span className="required-star">*</span></label>
            <input type="date" id="preferred_date" className={`input-base ${errors.preferred_date ? 'input-error' : ''}`} {...register('preferred_date', { required: true })} />
            {errors.preferred_date && <p className="text-crimson-500 text-sm mt-1">Required</p>}
          </div>
          <div>
            <label className="label-base" htmlFor="preferred_time_slot">Preferred Time Slot<span className="required-star">*</span></label>
            <select id="preferred_time_slot" className={`input-base ${errors.preferred_time_slot ? 'input-error' : ''}`} {...register('preferred_time_slot', { required: true })}>
              <option value="">Select</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            {errors.preferred_time_slot && <p className="text-crimson-500 text-sm mt-1">Required</p>}
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
          <div>
            <label className="label-base" htmlFor="alt_date">Alternative Date (optional)</label>
            <input type="date" id="alt_date" className="input-base" {...register('alt_date')} />
          </div>
          <div>
            <label className="label-base" htmlFor="alt_time_slot">Alternative Time Slot (optional)</label>
            <select id="alt_time_slot" className="input-base" {...register('alt_time_slot')}>
              <option value="">Select</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base" htmlFor="additional_notes">Additional Notes</label>
            <textarea id="additional_notes" rows={3} className="input-base" {...register('additional_notes')} />
          </div>
          <div className="flex justify-between mt-4">
            <Button type="submit" variant="primary" loading={isSubmitting}>Next</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
