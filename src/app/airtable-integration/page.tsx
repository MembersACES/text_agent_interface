import React from "react";

const AIRTABLES = [
  {
    title: "LOA Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrr1PYlng8vWqrF1?viewControls=on",
  },
  {
    title: "C&I E Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shr0FaRcL4JGRMzf2?viewControls=on",
  },
  {
    title: "SME E Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrhfIve3OME2BoHX?viewControls=on",
  },
  {
    title: "C&I G Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrCEfn2yXX3i9Elq?viewControls=on",
  },
  {
    title: "SME G Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shr2FHRs7uGxDB1Aw?viewControls=on",
  },
  {
    title: "Waste Database",
    src: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrwn1g4cKZZOzlZE?viewControls=on",
  },
];

export default function AirtableIntegrationPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Airtable Integration</h1>
      <div className="space-y-10">
        {AIRTABLES.map(({ title, src }) => (
          <section key={title}>
            <h2 className="text-xl font-semibold mb-4">{title}</h2>
            <iframe
              className="w-full border border-gray-300 rounded"
              src={src}
              frameBorder="0"
              width="100%"
              height="533"
              style={{ background: 'transparent' }}
              allowFullScreen
            ></iframe>
          </section>
        ))}
      </div>
    </div>
  );
} 