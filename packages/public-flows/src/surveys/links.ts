export type SurveyCampaignLinks = {
  staffSurveyUrl: string;
  customersSurveyUrl: string;
  manageUrl: string;
};

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
}

export function buildSurveyCampaignLinks(input: {
  baseUrl: string;
  campaignId: string;
  manageToken: string;
}): SurveyCampaignLinks {
  const base = normalizeBaseUrl(input.baseUrl);
  return {
    staffSurveyUrl: `${base}/survey/staff/appetite?c=${encodeURIComponent(input.campaignId)}`,
    customersSurveyUrl: `${base}/survey/customers/appetite?c=${encodeURIComponent(input.campaignId)}`,
    manageUrl: `${base}/survey/manage?t=${encodeURIComponent(input.manageToken)}`,
  };
}

export function buildSurveyQrUrl(rawUrl: string, format: 'png' | 'svg' = 'png') {
  const text = encodeURIComponent(rawUrl);
  return `https://quickchart.io/qr?size=640&margin=2&format=${format}&text=${text}`;
}
