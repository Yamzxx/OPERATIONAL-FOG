import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Save, 
  ArrowLeft, 
  X
} from 'lucide-react';
import { parseTimeToSeconds, formatSecondsToMMSS } from '../../services/eventEngine';

export const ScenarioConfig = ({ 
  scenarioToEdit, 
  onSaveScenario, 
  onCancel,
  onStartExercise
}) => {
  const [title, setTitle] = useState(scenarioToEdit?.title || '');
  const [category, setCategory] = useState(scenarioToEdit?.category || 'Latency & Signal');
  const [shortDesc, setShortDesc] = useState(scenarioToEdit?.shortDesc || '');
  const [objective, setObjective] = useState(scenarioToEdit?.objective || '');
  const [duration, setDuration] = useState(scenarioToEdit?.duration || '45 mins');
  const [difficulty, setDifficulty] = useState(scenarioToEdit?.difficulty || 'Intermediate');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Events list state
  const [events, setEvents] = useState(
    (scenarioToEdit?.events || [
      {
        id: 'ev-1',
        time: '00:00',
        title: 'Initial Command Dispatch',
        type: 'info',
        deliveryBehavior: 'normal',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Fictional exercise initiation dispatch. Establish primary communication mesh.',
        instructorNotes: 'Initial baseline event.'
      },
      {
        id: 'ev-2',
        time: '05:00',
        title: 'Signal Attenuation Warning',
        type: 'warning',
        deliveryBehavior: 'delayed',
        delaySeconds: 300, // 5 min delay
        intendedRecipient: 'all',
        content: 'RF interference detected. High frequency channels experiencing 300s transmission lag.',
        instructorNotes: 'Tests participant caution when dealing with out-of-date dispatches.'
      }
    ])
  );

  const handleAddEvent = () => {
    const nextMin = (events.length * 5).toString().padStart(2, '0');
    setEvents([
      ...events,
      {
        id: `ev-${Date.now()}`,
        time: `${nextMin}:00`,
        title: 'New Disruption Event',
        type: 'warning',
        deliveryBehavior: 'normal',
        delaySeconds: 180,
        intendedRecipient: 'all',
        content: 'Fictional situation report update.',
        instructorNotes: ''
      }
    ]);
  };

  const handleRemoveEvent = (id) => {
    if (events.length <= 1) {
      setValidationError('A scenario must contain at least one event.');
      return;
    }
    setEvents(events.filter(e => e.id !== id));
  };

  const handleMoveEvent = (index, direction) => {
    const updated = [...events];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setEvents(updated);
  };

  const handleUpdateEvent = (index, field, value) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const validate = () => {
    if (!title.trim()) return 'Scenario title is required.';
    if (!shortDesc.trim()) return 'Short description is required.';
    if (events.length === 0) return 'At least one event is required.';
    for (let i = 0; i < events.length; i++) {
      if (!events[i].title.trim()) return `Event #${i + 1} must have a title.`;
      if (!events[i].content.trim()) return `Event #${i + 1} must have message content.`;
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }

    const scenarioObj = {
      id: scenarioToEdit?.id || `scen-custom-${Date.now()}`,
      code: scenarioToEdit?.code || `SCEN-CFG-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      category,
      shortDesc: shortDesc.trim(),
      objective: objective.trim() || 'Fictional communication resilience training.',
      duration,
      difficulty,
      status: 'Ready',
      events,
      isCustom: true
    };

    onSaveScenario(scenarioObj);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div>
            <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
              {scenarioToEdit ? `Configure Scenario: ${scenarioToEdit.title}` : 'Build New Fictional Scenario'}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Define message scheduling, latency application, dropped dispatches, and role visibility.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            className="gov-btn gov-btn-secondary"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye size={15} />
            <span>Preview Scenario</span>
          </button>

          <button 
            type="button"
            className="gov-btn gov-btn-primary"
            onClick={handleSubmit}
          >
            <Save size={15} />
            <span>Save Scenario Draft</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', fontSize: '13px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{validationError}</span>
          <button onClick={() => setValidationError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* Scenario Overview Form */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', borderTop: '3px solid var(--color-primary-navy)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '14px' }}>
          1. Scenario Overview & Objectives
        </h3>

        <div className="gov-form-group">
          <label className="gov-form-label">Scenario Title</label>
          <input 
            type="text"
            className="gov-form-input"
            placeholder="e.g. Scenario D — Radar Telemetry Delay & Discrepancy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div className="gov-form-group">
            <label className="gov-form-label">Category</label>
            <select className="gov-form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Latency & Signal">Latency & Signal</option>
              <option value="Intel Synthesis">Intel Synthesis</option>
              <option value="Situational Awareness">Situational Awareness</option>
              <option value="Joint Operations">Joint Operations</option>
            </select>
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Friction Level</label>
            <select className="gov-form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Fundamental">Fundamental</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="High Friction">High Friction</option>
            </select>
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Configured Duration</label>
            <input 
              type="text"
              className="gov-form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 45 mins"
            />
          </div>
        </div>

        <div className="gov-form-group">
          <label className="gov-form-label">Short Description</label>
          <textarea 
            className="gov-form-input"
            rows={2}
            placeholder="Describe the fictional exercise scenario context and communication friction points..."
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            required
          />
        </div>

        <div className="gov-form-group">
          <label className="gov-form-label">Training Objective</label>
          <input 
            type="text"
            className="gov-form-input"
            placeholder="Specific learning objective..."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>
      </div>

      {/* Events Configuration Sequence Editor */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', borderTop: '3px solid var(--color-terracotta)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
              2. Fictional Event Sequence Configuration ({events.length} Events)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Configure message scheduling, delivery behaviors (normal, delayed, dropped, conflicting, incomplete), and targeted roles.
            </p>
          </div>

          <button 
            type="button"
            className="gov-btn gov-btn-secondary"
            onClick={handleAddEvent}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Plus size={14} />
            <span>Add Event</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {events.map((ev, idx) => (
            <div 
              key={ev.id}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderLeft: `4px solid ${ev.deliveryBehavior === 'dropped' ? '#DC2626' : ev.deliveryBehavior === 'delayed' ? '#D97706' : 'var(--color-primary-navy)'}`,
                padding: '16px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                  Event #{idx + 1}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={() => handleMoveEvent(idx, -1)} 
                    disabled={idx === 0}
                    style={{ background: '#FFF', border: '1px solid #CBD5E1', padding: '2px 6px', opacity: idx === 0 ? 0.4 : 1, cursor: 'pointer' }}
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleMoveEvent(idx, 1)} 
                    disabled={idx === events.length - 1}
                    style={{ background: '#FFF', border: '1px solid #CBD5E1', padding: '2px 6px', opacity: idx === events.length - 1 ? 0.4 : 1, cursor: 'pointer' }}
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveEvent(ev.id)}
                    style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '2px 6px', cursor: 'pointer' }}
                    title="Remove Event"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px 160px', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="gov-form-label" style={{ fontSize: '11px' }}>Time (MM:SS)</label>
                  <input 
                    type="text" 
                    className="gov-form-input" 
                    value={ev.time} 
                    onChange={(e) => handleUpdateEvent(idx, 'time', e.target.value)}
                    placeholder="05:00" 
                  />
                </div>

                <div>
                  <label className="gov-form-label" style={{ fontSize: '11px' }}>Event Title</label>
                  <input 
                    type="text" 
                    className="gov-form-input" 
                    value={ev.title} 
                    onChange={(e) => handleUpdateEvent(idx, 'title', e.target.value)}
                    placeholder="Title" 
                  />
                </div>

                <div>
                  <label className="gov-form-label" style={{ fontSize: '11px' }}>Delivery Behaviour</label>
                  <select 
                    className="gov-form-select"
                    value={ev.deliveryBehavior}
                    onChange={(e) => handleUpdateEvent(idx, 'deliveryBehavior', e.target.value)}
                  >
                    <option value="normal">Normal Delivery</option>
                    <option value="delayed">Delayed Delivery</option>
                    <option value="dropped">Dropped Message</option>
                    <option value="conflicting">Conflicting Report</option>
                    <option value="incomplete">Incomplete Report</option>
                  </select>
                </div>

                <div>
                  <label className="gov-form-label" style={{ fontSize: '11px' }}>Target Recipient</label>
                  <select 
                    className="gov-form-select"
                    value={ev.intendedRecipient}
                    onChange={(e) => handleUpdateEvent(idx, 'intendedRecipient', e.target.value)}
                  >
                    <option value="all">All Participants</option>
                    <option value="commander">Commander</option>
                    <option value="field_unit">Field Unit</option>
                    <option value="logistics">Logistics</option>
                    <option value="signals">Signals</option>
                  </select>
                </div>
              </div>

              {/* Extra options if Delayed */}
              {ev.deliveryBehavior === 'delayed' && (
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', padding: '8px 12px', marginBottom: '10px', fontSize: '12px' }}>
                  <label className="gov-form-label" style={{ fontSize: '11px', color: '#78350F' }}>
                    Latency Delay Amount (Seconds)
                  </label>
                  <input 
                    type="number"
                    className="gov-form-input"
                    style={{ width: '140px', background: '#FFF' }}
                    value={ev.delaySeconds || 300}
                    onChange={(e) => handleUpdateEvent(idx, 'delaySeconds', parseInt(e.target.value, 10) || 0)}
                  />
                  <span style={{ fontSize: '11px', color: '#92400E', marginLeft: '8px' }}>
                    Will be delivered at T+ {formatSecondsToMMSS((parseTimeToSeconds(ev.time) || 0) + (ev.delaySeconds || 300))}
                  </span>
                </div>
              )}

              <div>
                <label className="gov-form-label" style={{ fontSize: '11px' }}>Fictional Message Content</label>
                <textarea 
                  className="gov-form-input"
                  rows={2}
                  value={ev.content}
                  onChange={(e) => handleUpdateEvent(idx, 'content', e.target.value)}
                  placeholder="Message text dispatched to participants..."
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <label className="gov-form-label" style={{ fontSize: '11px', color: '#64748B' }}>Instructor Debrief Notes (Private)</label>
                <input 
                  type="text"
                  className="gov-form-input"
                  style={{ background: '#FFF', fontSize: '12px' }}
                  value={ev.instructorNotes}
                  onChange={(e) => handleUpdateEvent(idx, 'instructorNotes', e.target.value)}
                  placeholder="Qualitative notes for instructor reference during AAR..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Preview Modal */}
      {isPreviewOpen && (
        <div className="gov-modal-overlay" onClick={() => setIsPreviewOpen(false)}>
          <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} style={{ color: 'var(--color-gold-accent)' }} />
                <span style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontWeight: 'bold' }}>
                  Scenario Preview — {title || 'Untitled Scenario'}
                </span>
              </div>
              <button className="gov-modal-close" onClick={() => setIsPreviewOpen(false)} style={{ color: '#FFF' }}>
                <X size={20} />
              </button>
            </div>

            <div className="gov-modal-body">
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                <strong>Objective:</strong> {objective || 'Fictional exercise.'}
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px' }}>
                Configured Event Delivery Schedule ({events.length} Events)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {events.map((ev, i) => (
                  <div key={ev.id} style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      <span>[{ev.time}] #{i + 1}: {ev.title}</span>
                      <span style={{ textTransform: 'uppercase', color: ev.deliveryBehavior === 'dropped' ? '#DC2626' : ev.deliveryBehavior === 'delayed' ? '#D97706' : 'var(--color-primary-navy)' }}>
                        {ev.deliveryBehavior} ({ev.intendedRecipient})
                      </span>
                    </div>
                    <div style={{ color: '#334155', marginTop: '4px' }}>{ev.content}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                <button className="gov-btn gov-btn-secondary" onClick={() => setIsPreviewOpen(false)}>
                  Close Preview
                </button>
                <button 
                  className="gov-btn gov-btn-primary"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleSubmit(new Event('submit'));
                  }}
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
