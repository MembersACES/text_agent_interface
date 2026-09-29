// Build SME Gas Sheet Row: one row for the template's Airtable Data Sheet, including every step.
const b = $('Generate E SME to C&I Comparaison1').first().json.body;
const inv = b.full_invoice_data?.gas_sme_invoicedetails ?? {};
const fileId = $input.first().json.id; // from whichever Copy file template node ran
const num = v => (v === undefined || v === null || v === '' ? '' : Number(v));
const annualGj = Number(b.annual_usage_gj);

const row = {
  'MRIN': inv.mrin,
  'Customer Name': b.business_name,
  'Retailer': inv.retailer,
  'Invoice Review Period': inv.invoice_review_period,
  'Invoice Review Number of Days': b.invoice_review_days || inv.invoice_review_days,
  'Site Address:': inv.site_address,
  'Total Invoice Cost:': inv.total_invoice_cost,
  'Link to LOA': b.business_name,
  'Bus Name Copy (from Link to LOA)': b.business_name,
  'Trading As': b.business_trading_name,
  'ABN': b.business_abn,
  'Postal Address': b.postal_address,
  'Telephone': b.contact_phone,
  'Contact Name': b.contact_name,
  'Email': b.client_email,
  'Gas Invoice Rate': num(b.gas_rate_invoice),
  'Gas Invoice Usage': num(b.gas_usage_invoice),
  'Current Supply Charge': num(b.current_daily_supply),
  'New Supply Charge': num(b.comparison_daily_supply),
  'SME Invoice ex GST': num(inv.total_invoice_cost),
  'Offer Rate': num(b.offer1GasRate),
  'Contracted Rate:': num(b.offer1GasRate),
  'Monthly Usage': annualGj > 0 ? Number((annualGj / 12).toFixed(4)) : '',
  'Commission': num(b.commission_aud_per_gj),
  'Bill Days': num(inv.supply_charge?.quantity_days),
};

// Current bill steps (as shown, or as edited, on Base 2)
(b.sme_gas_bill_blocks || []).slice(0, 4).forEach((s, i) => {
  const k = i + 1;
  row[`Bill Step ${k} Label`] = s.threshold || `Block ${s.block}`;
  row[`Bill Step ${k} MJ`] = num(s.mj);
  row[`Bill Step ${k} c/MJ`] = num(s.rate_c_per_mj);
  row[`Bill Step ${k} $`] = num(s.amount_aud);
});

// Offer steps: season 1 = the first season on this bill, season 2 = the second (if the bill crosses one).
const used = (b.sme_gas_alinta_slices || []).filter(s => Number(s.days) > 0);
const fmt = n => Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
used.slice(0, 2).forEach((s, idx) => {
  const slot = idx + 1;
  row[`Offer S${slot} Label`] = s.season.replace(/\s*[–—]\s*/g, ' to ').replace(/\s*\(.*\)$/, '');
  row[`Offer S${slot} Days`] = s.days;
  (s.steps || []).slice(0, 5).forEach((st, i) => {
    const p = `Offer S${slot} Step ${i + 1} `;
    row[p + 'Band'] = st.to_mj_per_day == null ? `Over ${fmt(st.from_mj_per_day)}` : `${fmt(st.from_mj_per_day)} to ${fmt(st.to_mj_per_day)}`;
    row[p + 'MJ/day'] = Number(Number(st.mj_per_day).toFixed(1));
    row[p + 'MJ'] = Number(Number(st.mj).toFixed(0));
    row[p + 'c/MJ'] = st.rate_c_per_mj;
    row[p + '$'] = st.amount_aud;
  });
});

return [{ json: { ...row, file_id: fileId } }];
