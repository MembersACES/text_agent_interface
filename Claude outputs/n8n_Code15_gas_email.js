const rows = items.map(i => i.json).filter(Boolean).sort((a, b) => Number(a.row_number ?? 0) - Number(b.row_number ?? 0));
const b = $('Generate E SME to C&I Comparaison1').first()?.json?.body ?? {};
const inv = b.full_invoice_data?.gas_sme_invoicedetails ?? {};

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const first = (...v) => v.map(clean).find(Boolean) || '';
const money = v => [...String(v ?? '').matchAll(/\$?\s*(-?[\d,]+(?:\.\d{1,4})?)/g)].map(m => Number(m[1].replace(/,/g, ''))).filter(Number.isFinite);
const aud = n => Number.isFinite(n) ? n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }) : 'N/A';

const key = Object.keys(rows[0] ?? {}).find(k => !['row_number', 'col_2'].includes(k)) ?? 'Text';
const text = r => clean(r?.[key]);
const val = label => clean(rows.find(r => text(r).toLowerCase() === label.toLowerCase())?.col_2);
const includes = s => text(rows.find(r => text(r).toLowerCase().includes(s)));

const businessName = first(b.business_name, inv.client_name, 'the client');
const contact = first(b.contact_name);
const firstName = contact && !contact.includes('@') ? contact.split(' ')[0] : 'there';
const [curAnnual, newAnnual] = money(val('Annual Gas Cost'));
const [curMonthly, newMonthly] = money(val('Monthly Gas Cost'));
const savings = Number.isFinite(curAnnual) && Number.isFinite(newAnnual) ? curAnnual - newAnnual : null;
const pctLine = includes('reduction in estimated annual energy cost') || includes('increase in estimated annual energy cost');
const good = savings !== null && savings > 0;
const status = savings === null ? 'Gas Comparison Completed' : good ? 'Estimated Saving Identified' : 'Cost Increase Identified';
const colour = good ? '#0f6b5f' : '#8a5200';
const td = 'padding:10px; border:1px solid #dce5e2;';
const row = (l, v) => `<tr><td style="${td} background:#f8faf9; width:40%;"><strong>${esc(l)}</strong></td><td style="${td}">${esc(v)}</td></tr>`;

const html = `<html><body style="margin:0; padding:0; background:#f4f7f6; font-family:Arial, Helvetica, sans-serif; color:#1f2933;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6; padding:24px 0;"><tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:100%; background:#ffffff; border-radius:12px; border:1px solid #dce5e2;">
<tr><td style="background:#0f3d3e; padding:24px 28px; color:#ffffff; text-align:center;">
<div style="font-size:13px; text-transform:uppercase; color:#b7d8cf;">Gas Agreement Review</div>
<div style="font-size:24px; font-weight:bold; margin-top:6px;">${esc(status)}</div>
<div style="font-size:14px; color:#d7ebe5; margin-top:8px;">${esc(businessName)}</div></td></tr>
<tr><td style="padding:28px;">
<p style="font-size:15px;">Hi ${esc(firstName)},</p>
<p style="font-size:15px; line-height:1.6;">I hope you are well. We have reviewed your current gas arrangement against a proposed new offer for your site. Below is a summary of the estimated gas costs and the overall Year 1 outcome.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:24px; font-size:14px;">
${row('Business', businessName)}${row('Site Address', first(inv.site_address, b.site_address))}${row('MRIN', first(inv.mrin, b.mrin))}
${row('Current Retailer', first(inv.retailer))}${b.sme_gas_network ? row('Gas Network', b.sme_gas_network) : ''}</table>
<table width="100%" style="margin-bottom:24px; background:${good ? '#edf7f4' : '#fff4df'}; border:1px solid ${good ? '#a9d2c8' : '#e8bd72'}; border-radius:10px;"><tr><td style="padding:22px; text-align:center; color:${colour};">
<div style="font-size:13px; text-transform:uppercase; font-weight:bold;">${good ? 'Estimated Year 1 Saving' : 'Estimated Year 1 Outcome'}</div>
<div style="font-size:32px; font-weight:bold; margin-top:6px;">${savings === null ? 'Refer to attached comparison' : aud(Math.abs(savings))}</div>
<div style="font-size:13px; margin-top:7px;">${esc(pctLine)}</div></td></tr></table>
<div style="font-size:17px; font-weight:bold; color:#0f3d3e; margin-bottom:10px;">Current vs Proposed Gas Cost</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px; margin-bottom:8px;">
<tr><th align="left" style="${td} background:#f1f5f4;">Cost Measure</th><th align="right" style="${td} background:#f1f5f4;">Current</th><th align="right" style="${td} background:#f1f5f4;">Proposed</th></tr>
<tr><td style="${td}"><b>Average Monthly Gas Cost</b></td><td align="right" style="${td}">${aud(curMonthly)}</td><td align="right" style="${td}">${aud(newMonthly)}</td></tr>
<tr><td style="${td}"><b>Estimated Annual Gas Cost</b></td><td align="right" style="${td}">${aud(curAnnual)}</td><td align="right" style="${td}">${aud(newAnnual)}</td></tr></table>
<p style="font-size:12px; color:#667a75; margin-bottom:24px;">Costs include the gas usage charges and the daily supply charge. Gas usage is charged in steps, and the attached Step Comparison shows every step for your current bill and the proposed offer.</p>
<p style="font-size:14px;"><b>Attached for Review</b><br>&bull; SME Gas Comparison Pack (Summary, Step Comparison and Engagement Form)<br>&bull; Copy of the current gas invoice</p>
<p style="font-size:14px; line-height:1.7;">Please review the attached comparison and engagement form and let us know if you would like to proceed. Once confirmed, our team will coordinate the new gas agreement and provide any required documentation for signature.</p>
<p style="font-size:14px;">Kind regards,</p>
<p style="font-size:14px; line-height:1.6;"><b>The Team</b><br>Australian Circular Economy Solutions<br><br><b>Carbon Zero Australasia</b><br>Australian Circular Economy Solutions Division<br>Direct: 0468 050 399<br>
Email: <a href="mailto:business@acesolutions.com.au">business@acesolutions.com.au</a><br>470 St Kilda Road, Melbourne VIC 3004<br>Website: <a href="https://acesolutions.com.au">acesolutions.com.au</a></p>
</td></tr></table></td></tr></table></body></html>`;

return [{ json: {
  subject: `Gas Agreement Review for ${businessName}`, html, businessName,
  current_cost: curAnnual ?? 0, new_cost: newAnnual ?? 0, annual_savings: savings ?? 0,
  currentRates: 'Step pricing', proposedRates: 'Step pricing',
} }];
