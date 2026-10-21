import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle, Mail, AtSign, User, Shield,
  CalendarDays, LogOut, ArrowLeft, CheckCircle2, Loader2,
  MapPin, Scale, FileCheck, Phone, Clock, FileText,
  Pencil, Save, X, Globe, Building2, Hash,
  AlertCircle, MessageSquare, Video, Calendar,
} from 'lucide-react';
import { StepNav } from '../components/navigation/StepNav';
import { useAuth } from '../contexts/AuthContext';
import { useFormContext } from '../contexts/FormContext';

export const PersonalInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { formState, updateLocation, updateLegalIssue, updateEligibility, updateContact, updateAppointment } = useFormContext();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logout();
      navigate('/login', { replace: true });
    }, 600);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    const name = user.full_name || user.username || '';
    return name
      .split(' ')
      .map((w: string) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const startEditing = (section: string, data: Record<string, string>) => {
    setEditingSection(section);
    setEditData({ ...data });
    setSaveSuccess(null);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditData({});
  };

  const saveSection = (section: string) => {
    switch (section) {
      case 'location':
        updateLocation(editData as any);
        break;
      case 'legal_issue':
        updateLegalIssue(editData as any);
        break;
      case 'eligibility':
        updateEligibility(editData as any);
        break;
      case 'contact':
        updateContact(editData as any);
        break;
      case 'appointment':
        updateAppointment(editData as any);
        break;
    }
    setEditingSection(null);
    setEditData({});
    setSaveSuccess(section);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  const handleEditChange = (key: string, value: string) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const displayValue = (val: string | boolean | undefined) => {
    if (val === undefined || val === null || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  /* Icon map for different field types */
  const getFieldIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      country: <Globe size={15} />,
      state: <MapPin size={15} />,
      district: <Building2 size={15} />,
      city: <Building2 size={15} />,
      pin_code: <Hash size={15} />,
      issue_type: <Scale size={15} />,
      description: <FileText size={15} />,
      court_case_in_progress: <Scale size={15} />,
      court_deadline: <Calendar size={15} />,
      urgency: <AlertCircle size={15} />,
      eligibility_category: <FileCheck size={15} />,
      eligibility_details: <FileText size={15} />,
      supporting_document: <FileCheck size={15} />,
      full_name: <User size={15} />,
      mobile_number: <Phone size={15} />,
      email: <Mail size={15} />,
      preferred_contact: <MessageSquare size={15} />,
      consultation_mode: <Video size={15} />,
      preferred_date: <CalendarDays size={15} />,
      preferred_time_slot: <Clock size={15} />,
      alt_date: <CalendarDays size={15} />,
      alt_time_slot: <Clock size={15} />,
      additional_notes: <FileText size={15} />,
    };
    return iconMap[key] || <FileText size={15} />;
  };

  const hasFormData = formState.completedSteps.length > 0 ||
    Object.values(formState.location).some(v => v !== '') ||
    Object.values(formState.contact).some(v => v !== '');

  /* ── Section configs ── */
  const sections = [
    {
      key: 'location',
      title: 'Location Details',
      icon: <MapPin size={18} />,
      step: 1,
      data: formState.location,
      fields: ['country', 'state', 'district', 'city', 'pin_code'],
    },
    {
      key: 'legal_issue',
      title: 'Legal Issue Details',
      icon: <Scale size={18} />,
      step: 2,
      data: formState.legal_issue,
      fields: ['issue_type', 'description', 'court_case_in_progress', 'court_deadline', 'urgency'],
    },
    {
      key: 'eligibility',
      title: 'Eligibility Details',
      icon: <FileCheck size={18} />,
      step: 3,
      data: formState.eligibility,
      fields: ['eligibility_category', 'eligibility_details', 'supporting_document'],
    },
    {
      key: 'contact',
      title: 'Contact Details',
      icon: <Phone size={18} />,
      step: 4,
      data: formState.contact,
      fields: ['full_name', 'mobile_number', 'email', 'preferred_contact', 'consultation_mode'],
    },
    {
      key: 'appointment',
      title: 'Appointment Preferences',
      icon: <Clock size={18} />,
      step: 5,
      data: formState.appointment,
      fields: ['preferred_date', 'preferred_time_slot', 'consultation_mode', 'alt_date', 'alt_time_slot', 'additional_notes'],
    },
  ];

  return (
    <div className="pi-root">
      <StepNav activeStep={0} />

      <div className="pi-container-wide">
        {/* Back link */}
        <button className="pi-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Page header */}
        <div className="pi-header">
          <h1 className="pi-title">Personal Information</h1>
          <p className="pi-subtitle">
            Your account details, profile information, and all form data submitted during the appointment process.
          </p>
        </div>

        <div className="pi-layout-full">
          {/* ── Left: Avatar card ── */}
          <div className="pi-avatar-card">
            <div className="pi-avatar-circle">
              {getInitials()}
            </div>
            <p className="pi-avatar-name">{user?.full_name || user?.username || 'User'}</p>
            <p className="pi-avatar-handle">@{user?.username || '—'}</p>
            <div className="pi-avatar-badge">
              <Shield size={13} />
              <span>Verified Account</span>
            </div>

            <div className="pi-avatar-divider" />

            {/* Account details mini */}
            <div className="pi-mini-details">
              <div className="pi-mini-row">
                <Mail size={14} />
                <span>{user?.email || '—'}</span>
              </div>
              <div className="pi-mini-row">
                <CalendarDays size={14} />
                <span>Joined {formatDate(user?.created_at)}</span>
              </div>
            </div>

            <div className="pi-avatar-divider" />

            <button
              className="pi-logout-full-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <><Loader2 size={16} className="animate-spin" /> Signing out…</>
              ) : (
                <><LogOut size={16} /> Sign Out</>
              )}
            </button>
          </div>

          {/* ── Right: All details ── */}
          <div className="pi-right-col">
            {/* Account Details Card */}
            <div className="pi-section-card">
              <div className="pi-section-header">
                <div className="pi-section-header-left">
                  <UserCircle size={18} className="pi-section-icon" />
                  <h2 className="pi-section-title">Account Details</h2>
                </div>
              </div>

              <div className="pi-info-grid">
                <div className="pi-info-row">
                  <div className="pi-info-icon-wrap"><User size={16} /></div>
                  <div className="pi-info-content">
                    <span className="pi-info-label">Full Name</span>
                    <span className="pi-info-value">{user?.full_name || '—'}</span>
                  </div>
                  {user?.full_name && <CheckCircle2 size={16} className="pi-info-check" />}
                </div>
                <div className="pi-info-row">
                  <div className="pi-info-icon-wrap"><AtSign size={16} /></div>
                  <div className="pi-info-content">
                    <span className="pi-info-label">Username</span>
                    <span className="pi-info-value">{user?.username || '—'}</span>
                  </div>
                  {user?.username && <CheckCircle2 size={16} className="pi-info-check" />}
                </div>
                <div className="pi-info-row">
                  <div className="pi-info-icon-wrap"><Mail size={16} /></div>
                  <div className="pi-info-content">
                    <span className="pi-info-label">Email Address</span>
                    <span className="pi-info-value">{user?.email || '—'}</span>
                  </div>
                  {user?.email && <CheckCircle2 size={16} className="pi-info-check" />}
                </div>
                <div className="pi-info-row">
                  <div className="pi-info-icon-wrap"><CalendarDays size={16} /></div>
                  <div className="pi-info-content">
                    <span className="pi-info-label">Member Since</span>
                    <span className="pi-info-value">{formatDate(user?.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Form Data Sections ── */}
            {!hasFormData && (
              <div className="pi-empty-form">
                <div className="pi-empty-icon-wrap">
                  <FileText size={28} />
                </div>
                <h3 className="pi-empty-title">No Form Data Yet</h3>
                <p className="pi-empty-desc">
                  You haven't filled out any appointment forms yet. Once you complete the steps, all your information will appear here.
                </p>
                <button className="pi-empty-btn" onClick={() => navigate('/step/1')}>
                  Start Application →
                </button>
              </div>
            )}

            {hasFormData && sections.map(section => {
              const isEditing = editingSection === section.key;
              const isSaved = saveSuccess === section.key;

              return (
                <div key={section.key} className={`pi-section-card ${isSaved ? 'pi-section-saved' : ''}`}>
                  <div className="pi-section-header">
                    <div className="pi-section-header-left">
                      <span className="pi-section-icon">{section.icon}</span>
                      <h2 className="pi-section-title">{section.title}</h2>
                      <span className="pi-section-step">Step {section.step}</span>
                    </div>
                    <div className="pi-section-header-right">
                      {isSaved && (
                        <span className="pi-saved-badge">
                          <CheckCircle2 size={14} /> Saved
                        </span>
                      )}
                      {isEditing ? (
                        <div className="pi-edit-actions">
                          <button className="pi-save-btn" onClick={() => saveSection(section.key)}>
                            <Save size={14} /> Save
                          </button>
                          <button className="pi-cancel-btn" onClick={cancelEditing}>
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="pi-edit-btn"
                          onClick={() => {
                            const d: Record<string, string> = {};
                            section.fields.forEach(f => { d[f] = String((section.data as any)[f] || ''); });
                            startEditing(section.key, d);
                          }}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pi-section-body">
                    {section.fields.map(field => {
                      const value = (section.data as any)[field];
                      return (
                        <div key={field} className="pi-field-row">
                          <div className="pi-field-icon">{getFieldIcon(field)}</div>
                          <div className="pi-field-content">
                            <span className="pi-field-label">{formatLabel(field)}</span>
                            {isEditing ? (
                              field === 'description' || field === 'eligibility_details' || field === 'additional_notes' ? (
                                <textarea
                                  className="pi-field-input pi-field-textarea"
                                  value={editData[field] || ''}
                                  onChange={e => handleEditChange(field, e.target.value)}
                                  rows={3}
                                  placeholder={`Enter ${formatLabel(field).toLowerCase()}`}
                                />
                              ) : (
                                <input
                                  className="pi-field-input"
                                  type="text"
                                  value={editData[field] || ''}
                                  onChange={e => handleEditChange(field, e.target.value)}
                                  placeholder={`Enter ${formatLabel(field).toLowerCase()}`}
                                />
                              )
                            ) : (
                              <span className={`pi-field-value ${!value || value === '' ? 'pi-field-empty' : ''}`}>
                                {displayValue(value)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Consent Summary */}
            {hasFormData && (
              <div className="pi-section-card">
                <div className="pi-section-header">
                  <div className="pi-section-header-left">
                    <span className="pi-section-icon"><Shield size={18} /></span>
                    <h2 className="pi-section-title">Consent & Confirmation</h2>
                    <span className="pi-section-step">Step 6</span>
                  </div>
                </div>
                <div className="pi-section-body">
                  <div className="pi-consent-row">
                    <div className={`pi-consent-check ${formState.consent.consent_use_of_info ? 'pi-consent-yes' : 'pi-consent-no'}`}>
                      {formState.consent.consent_use_of_info ? <CheckCircle2 size={16} /> : <X size={16} />}
                    </div>
                    <span className="pi-consent-label">Consent to use of information</span>
                  </div>
                  <div className="pi-consent-row">
                    <div className={`pi-consent-check ${formState.consent.consent_accuracy ? 'pi-consent-yes' : 'pi-consent-no'}`}>
                      {formState.consent.consent_accuracy ? <CheckCircle2 size={16} /> : <X size={16} />}
                    </div>
                    <span className="pi-consent-label">Confirmed accuracy of information</span>
                  </div>
                  <div className="pi-consent-row">
                    <div className={`pi-consent-check ${formState.consent.consent_booking_approval ? 'pi-consent-yes' : 'pi-consent-no'}`}>
                      {formState.consent.consent_booking_approval ? <CheckCircle2 size={16} /> : <X size={16} />}
                    </div>
                    <span className="pi-consent-label">Booking approval consent</span>
                  </div>
                </div>
              </div>
            )}

            {/* Security Note */}
            <div className="pi-note">
              <Shield size={15} className="pi-note-icon" />
              <div>
                <p className="pi-note-title">Data Security</p>
                <p className="pi-note-body">
                  Your personal information and form data are securely stored and protected.
                  You can edit your form details above at any time before your appointment is confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
