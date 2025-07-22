import React from 'react';

const INDUSTRY_OPTIONS = [
  '003-Clubs',
  '003-Hardware',
  '003-Health Care',
  '003-Hotels',
  '003-Others',
  '003-Supermarkets',
];

const SUBFOLDER_OPTIONS: Record<string, string[]> = {
  '003-Clubs': ['NSW', 'QLD', 'TAS', 'WA', 'ACT', 'SA', 'A - RSL', 'A - AFL', 'VIC'],
  '003-Hardware': ['SA', 'QLD', 'TAS', 'ACT', 'NSW', 'WA', 'VIC'],
  '003-Health Care': ['SA', 'TAS', 'QLD', 'NSW', 'WA', 'ACT', 'VIC'],
  '003-Hotels': ['WA', 'TAS', 'QLD', 'SA', 'VIC', 'ACT', 'NSW'],
  '003-Others': ['QLD', 'ACT', 'TAS', 'NT', 'SA', 'NSW', 'WA', 'VIC'],
  '003-Supermarkets': ['WA', 'SA', 'QLD', 'NSW', 'VIC', 'TAS', 'A - Reddrop', 'A - Sercon', 'ACT', 'A - Ben Ryan'],
};

interface Props {
  industry: string;
  setIndustry: (value: string) => void;
  subfolder: string;
  setSubfolder: (value: string) => void;
  step: number;
}

const IndustrySubfolderSelector: React.FC<Props> = ({ industry, setIndustry, subfolder, setSubfolder, step }) => {
  return (
    <div className="space-y-4">
      {step === 4 && (
        <div>
          <label className="block font-medium mb-1">Industry Classification</label>
          <select
            className="w-full border rounded p-2"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
          >
            <option value="">Select industry...</option>
            {INDUSTRY_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
      {step === 5 && industry && (
        <div>
          <label className="block font-medium mb-1">Subfolder (State/Classification)</label>
          <select
            className="w-full border rounded p-2"
            value={subfolder}
            onChange={e => setSubfolder(e.target.value)}
          >
            <option value="">Select subfolder...</option>
            {SUBFOLDER_OPTIONS[industry]?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default IndustrySubfolderSelector; 