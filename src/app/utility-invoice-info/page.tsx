"use client";
import Link from "next/link";

const tools = [
  { href: "/utility-invoice-info/ci-electricity", label: "C&I Electricity Invoice Information" },
  { href: "/utility-invoice-info/sme-electricity", label: "SME Electricity Invoice Information" },
  { href: "/utility-invoice-info/ci-gas", label: "C&I Gas Invoice Information" },
  { href: "/utility-invoice-info/sme-gas", label: "SME Gas Invoice Information" },
  { href: "/utility-invoice-info/waste", label: "Waste Invoice Information" },
  { href: "/utility-invoice-info/oil", label: "Oil Invoice Information" },
];

export default function UtilityInvoiceInfoPage() {
  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginBottom: 24 }}>Utility Invoice Information</h2>
      <div style={{ marginBottom: 24, color: '#555' }}>
        Select a utility type below to retrieve the latest invoice details for a business.
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tools.map(tool => (
          <li key={tool.href} style={{ marginBottom: 18 }}>
            <Link href={tool.href} style={{ fontSize: 18, color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              {tool.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 