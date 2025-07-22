import React from 'react';

const STATES = [
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
];

const CLASSIFICATIONS = [
  'Retail', 'Hospitality', 'Healthcare', 'Education', 'Manufacturing', 'Other'
];

interface Props {
  state: string;
  setState: (value: string) => void;
  classification: string;
  setClassification: (value: string) => void;
}

const StateClassificationSelector: React.FC<Props> = ({ state, setState, classification, setClassification }) => (
  <div className="flex gap-4">
    <div className="flex-1">
      <label className="block font-medium mb-1">State</label>
      <select
        className="w-full border rounded p-2"
        value={state}
        onChange={e => setState(e.target.value)}
      >
        <option value="">Select state...</option>
        {STATES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
    <div className="flex-1">
      <label className="block font-medium mb-1">Classification</label>
      <select
        className="w-full border rounded p-2"
        value={classification}
        onChange={e => setClassification(e.target.value)}
      >
        <option value="">Select classification...</option>
        {CLASSIFICATIONS.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  </div>
);

export default StateClassificationSelector; 