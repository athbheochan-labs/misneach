import type { SurveyCampaignLinks } from './surveys/links';

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderSurveyCampaignEmailHtml(businessName: string, links: SurveyCampaignLinks) {
  const safeBusinessName = escapeHtml(businessName);

  return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a18;">
        <h2 style="margin: 0 0 12px;">Your Misneach appetite survey links</h2>
        <p style="margin: 0 0 10px;">Business: <strong>${safeBusinessName}</strong></p>
        <p style="margin: 0 0 6px;"><strong>Staff survey:</strong> <a href="${links.staffSurveyUrl}">${links.staffSurveyUrl}</a></p>
        <p style="margin: 0 0 6px;"><strong>Customer survey:</strong> <a href="${links.customersSurveyUrl}">${links.customersSurveyUrl}</a></p>
        <p style="margin: 0 0 12px;"><strong>Manage results:</strong> <a href="${links.manageUrl}">${links.manageUrl}</a></p>
        <p style="margin: 0;">You can return to your results anytime with the manage link.</p>
      </div>
    `;
}

export function buildSurveyCampaignEmailText(businessName: string, links: SurveyCampaignLinks) {
  return [
    `Business: ${businessName}`,
    '',
    `Staff survey: ${links.staffSurveyUrl}`,
    `Customer survey: ${links.customersSurveyUrl}`,
    `Manage results: ${links.manageUrl}`,
  ].join('\n');
}
