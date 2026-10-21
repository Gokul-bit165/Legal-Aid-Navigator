import React from 'react';
import { CheckCircle, CalendarCheck, UserCircle, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface StepNavProps {
  activeStep: number;
}

const steps = [
  { id: 1, label: 'Location details' },
  { id: 2, label: 'Legal issue details' },
  { id: 3, label: 'Eligibility details' },
  { id: 4, label: 'Contact details' },
  { id: 5, label: 'Appointment preferences' },
  { id: 6, label: 'Consent & confirmation' },
];

export const StepNav: React.FC<StepNavProps> = ({ activeStep }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isStatusPage = location.pathname === '/appointment-status';
  const isPersonalInfoPage = location.pathname === '/app/personal-info';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="step-nav-bar">
      {/* Logo */}
      <div className="step-nav-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M12 2L3 7v5c0 5.25 3.84 9.74 9 11 5.16-1.26 9-5.75 9-11V7l-9-5z" />
          <path d="M9 11l2 2 4-4" />
        </svg>
        <div>
          <p className="step-nav-logo-name">Legal Aid Navigator</p>
          <p className="step-nav-logo-tag">Find the right legal support, near you.</p>
        </div>
      </div>

      {/* Steps */}
      <div className="step-nav-steps">
        {steps.map(step => {
          const isActive = !isStatusPage && !isPersonalInfoPage && step.id === activeStep;
          const isCompleted = !isStatusPage && !isPersonalInfoPage && step.id < activeStep;
          return (
            <div
              key={step.id}
              className={`step-item ${isActive ? 'step-item-active' : isCompleted ? 'step-item-completed' : 'step-item-inactive'}`}
            >
              <div className="flex items-center gap-1.5">
                {isCompleted ? (
                  <CheckCircle size={14} className="text-bark-500 flex-shrink-0" />
                ) : (
                  <span className="step-num">{step.id}</span>
                )}
                <span className="step-label">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right-side action buttons */}
      <div className="step-nav-actions">
        {/* Appointment Status CTA */}
        <button
          id="appointment-status-btn"
          className={`appt-status-btn ${isStatusPage ? 'appt-status-btn-active' : ''}`}
          onClick={() => navigate('/appointment-status')}
          title="View appointment status"
        >
          <CalendarCheck size={15} />
          <span>Appointment status</span>
        </button>

        {/* Personal Info */}
        <button
          id="personal-info-btn"
          className={`personal-info-btn ${isPersonalInfoPage ? 'personal-info-btn-active' : ''}`}
          onClick={() => navigate('/app/personal-info')}
          title="View and edit your personal information"
        >
          <UserCircle size={15} />
          <span>Personal info</span>
        </button>

        {/* Logout */}
        <button
          id="logout-btn"
          className="logout-btn"
          onClick={handleLogout}
          title="Sign out of Legal Aid Navigator"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};
