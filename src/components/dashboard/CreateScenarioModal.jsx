import React, { useState } from 'react';
import { X, Plus, Trash2, ShieldAlert } from 'lucide-react';

export const CreateScenarioModal = ({ isOpen, onClose, onSaveScenario }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Latency & Signal');
  const [shortDesc, setShortDesc] = useState('');
  const [objective, setObjective] = useState('');
  const [duration, setDuration] = useState('45 mins (Configurable)');
  const [difficulty, setDifficulty] = useState('Intermediate');
  
  const [events, setEvents] = useState([
    { id: 'ev-1', time: '00:00', title: 'Initial Dispatch', type: 'info', content: 'Fictional exercise initiation dispatch.' }
  ]);

  if (!isOpen) return null;

  const handleAddEvent = () => {
    setEvents([
      ...events,
      { id: `ev-${Date.now()}`, time: '10:00', title: 'New Simulation Friction Event', type: 'warning', content: 'Fictional signal delay event description.' }
    ]);
  };

  const handleRemoveEvent = (id) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !shortDesc.trim()) return;

    const newScenario = {
      id: `scen-custom-${Date.now()}`,
      title: title.trim(),
      code: `SCEN-CUST-${Math.floor(100 + Math.random() * 900)}`,
      category,
      shortDesc: shortDesc.trim(),
      objective: objective.trim() || 'Custom command resilience evaluation.',
      duration,
      difficulty,
      status: 'Ready (Draft)',
      events,
      isCustom: true
    };

    onSaveScenario(newScenario);
    onClose();
  };

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
              INSTRUCTOR TOOLKIT • SCENARIO BUILDER
            </div>
            <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
              Create Fictional Training Scenario Draft
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gov-modal-body">
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', padding: '10px', fontSize: '12px', color: '#78350F', marginBottom: '16px' }}>
            <strong>Instructor Notice:</strong> All scenarios must remain fictional and intended strictly for communication friction & coordination training.
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Scenario Title</label>
            <input 
              type="text" 
              className="gov-form-input" 
              placeholder="e.g. Scenario D — Telemetry Blackout" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Short Description</label>
            <textarea 
              className="gov-form-input" 
              rows={2}
              placeholder="Brief summary of the fictional communication friction scenario..." 
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
              placeholder="Primary learning objective..." 
              value={objective} 
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                Fictional Event Sequence ({events.length})
              </span>
              <button 
                type="button" 
                onClick={handleAddEvent}
                style={{ background: 'none', border: 'none', color: 'var(--color-terracotta)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                <span>Add Event</span>
              </button>
            </div>

            {events.map((ev, index) => (
              <div key={ev.id} style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 30px', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="gov-form-input" 
                    value={ev.time} 
                    onChange={(e) => {
                      const updated = [...events];
                      updated[index].time = e.target.value;
                      setEvents(updated);
                    }}
                    placeholder="Time" 
                  />
                  <input 
                    type="text" 
                    className="gov-form-input" 
                    value={ev.title} 
                    onChange={(e) => {
                      const updated = [...events];
                      updated[index].title = e.target.value;
                      setEvents(updated);
                    }}
                    placeholder="Event Title" 
                  />
                  <select 
                    className="gov-form-select" 
                    value={ev.type} 
                    onChange={(e) => {
                      const updated = [...events];
                      updated[index].type = e.target.value;
                      setEvents(updated);
                    }}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="delay">Delay</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveEvent(ev.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '16px' }}>
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary">
              Save Fictional Scenario Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
