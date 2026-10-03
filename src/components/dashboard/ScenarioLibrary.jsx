import React, { useState } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Play, 
  Info, 
  Clock, 
  Filter, 
  CheckCircle,
  X,
  ShieldCheck
} from 'lucide-react';

export const ScenarioLibrary = ({ 
  scenarios, 
  searchQuery, 
  onStartScenario, 
  onOpenCreateModal 
}) => {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredScenarios = scenarios.filter(scen => {
    const matchesSearch = searchQuery === '' || 
      scen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scen.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || scen.category.toUpperCase().includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
            Scenario Library
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Fictional training scenarios designed for decision verification under communication friction.
          </p>
        </div>

        <button className="gov-btn gov-btn-primary" onClick={onOpenCreateModal}>
          <PlusCircle size={16} />
          <span>Create Scenario Draft</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#FFF', padding: '12px 16px', border: '1px solid #CBD5E1' }}>
        <Filter size={16} style={{ color: '#64748B' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Category Filter:</span>

        {['ALL', 'LATENCY', 'INTEL SYNTHESIS', 'SITUATIONAL AWARENESS'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              background: categoryFilter === cat ? 'var(--color-primary-navy)' : '#F1F5F9',
              color: categoryFilter === cat ? '#FFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scenario Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredScenarios.map((scen) => (
          <div 
            key={scen.id}
            style={{
              backgroundColor: '#FFF',
              border: '1px solid #CBD5E1',
              borderTop: '3px solid var(--color-primary-navy)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', border: '1px solid #BAE6FD' }}>
                {scen.code} • {scen.category}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} />
                <span>{scen.status}</span>
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
              {scen.title}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '14px', flexGrow: 1 }}>
              {scen.shortDesc}
            </p>

            <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '8px 10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#64748B', fontSize: '10px' }}>TRAINING OBJECTIVE</div>
              <div style={{ color: 'var(--color-text-primary)', marginTop: '2px' }}>{scen.objective}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B', borderTop: '1px dashed #CBD5E1', paddingTop: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} />
                <span>Est. Duration: {scen.duration}</span>
              </div>
              <span>Friction: {scen.difficulty}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                className="gov-btn gov-btn-secondary" 
                style={{ fontSize: '12px', padding: '8px' }}
                onClick={() => setSelectedScenario(scen)}
              >
                <Info size={14} />
                <span>View Details</span>
              </button>

              <button 
                className="gov-btn gov-btn-primary" 
                style={{ fontSize: '12px', padding: '8px' }}
                onClick={() => onStartScenario(scen)}
              >
                <Play size={14} />
                <span>Start Exercise</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Detail Modal */}
      {selectedScenario && (
        <div className="gov-modal-overlay" onClick={() => setSelectedScenario(null)}>
          <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
                  FICTIONAL SCENARIO DETAILS • {selectedScenario.code}
                </div>
                <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
                  {selectedScenario.title}
                </div>
              </div>
              <button className="gov-modal-close" onClick={() => setSelectedScenario(null)} style={{ color: '#FFF' }}>
                <X size={20} />
              </button>
            </div>

            <div className="gov-modal-body">
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '6px' }}>Overview</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                {selectedScenario.shortDesc}
              </p>

              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '6px' }}>Training Objective</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                {selectedScenario.objective}
              </p>

              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>Configured Event Sequence</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {selectedScenario.events?.map((ev) => (
                  <div key={ev.id} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '3px solid var(--color-primary-navy)', padding: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      <span>[{ev.time}] {ev.title}</span>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B' }}>{ev.type}</span>
                    </div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>{ev.content}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                <button className="gov-btn gov-btn-secondary" onClick={() => setSelectedScenario(null)}>
                  Close
                </button>
                <button 
                  className="gov-btn gov-btn-primary" 
                  onClick={() => {
                    const scen = selectedScenario;
                    setSelectedScenario(null);
                    onStartScenario(scen);
                  }}
                >
                  <Play size={14} />
                  <span>Start Exercise Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
