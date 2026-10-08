import { PHASE_GUIDE, PHASE_LABEL, type Phase } from '../lib/cycle';
import { PHASE_ART } from '../lib/phaseVisuals';
import { Sheet } from './ui';

export function PhaseSheet({ phase, current, onClose }: { phase: Phase | null; current: Phase | null; onClose: () => void }) {
  if (!phase) return null;
  const guide = PHASE_GUIDE[phase];
  const art = PHASE_ART[phase];
  return (
    <Sheet open onClose={onClose} title={`${PHASE_LABEL[phase]} phase`}>
      <div className="center stack" style={{ alignItems: 'center', gap: 6 }}>
        <div className="phase-card__art" style={{ background: art.bg, width: 110, height: 110, borderRadius: '50%', fontSize: '3.4rem' }}>{art.emoji}</div>
        <span className="small faint">{phase === current ? 'Current phase' : 'Phase of your cycle'}</span>
        <strong>{guide.tagline}</strong>
      </div>
      <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
        <h3>What happens</h3>
        <p className="small muted">{guide.about}</p>
      </div>
      <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
        <div className="row" style={{ gap: 8 }}>
          <h3>Fertilization chances</h3>
          <span className={`badge badge--${art.fertility.toLowerCase()}`}>{art.fertility}</span>
        </div>
        <p className="small muted">{art.fertilityNote}</p>
      </div>
      <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
        <h3>🍲 Eat</h3>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{guide.eat.map((e) => <li key={e}>{e}</li>)}</ul>
        <h3>🚶 Move</h3>
        <p className="small muted">{guide.move}</p>
        <h3>🌙 Rest</h3>
        <p className="small muted">{guide.rest}</p>
      </div>
      <p className="tiny faint center">Estimates for wellbeing only — not medical advice or contraception.</p>
    </Sheet>
  );
}
