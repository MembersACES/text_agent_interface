import React from 'react';

interface Props {
  details: Record<string, any>;
}

const LABELS: Record<string, string> = {
  'Business Name': 'Business Name',
  'Trading As': 'Trading As',
  'Business ABN': 'ABN',
  'Postal Address': 'Postal Address',
  'Site Address': 'Site Address',
  'Contact Name': 'Contact Name',
  'Contact Position': 'Position',
  'Contact  Email  :': 'Email',
  'Contact Number:': 'Phone',
  'Date': 'Date',
};

const BusinessDetailsDisplay: React.FC<Props> = ({ details }) => (
  <div className="bg-gray-50 rounded p-4 space-y-2">
    {Object.entries(LABELS).map(([key, label]) =>
      details[key] ? (
        <div key={key} className="flex justify-between">
          <span className="font-medium">{label}:</span>
          <span>{details[key]}</span>
        </div>
      ) : null
    )}
  </div>
);

export default BusinessDetailsDisplay; 