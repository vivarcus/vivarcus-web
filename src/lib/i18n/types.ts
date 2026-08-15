export type DisplayContext = {
  language: string;
  locale: string;
  timezone: string;
  date_format_profile?: string;
};

export type DisplayText = {
  text: string;
  key?: string;
  fallback_source?: string;
  language?: string;
};

export const defaultDisplayContext: DisplayContext = {
  language: "en",
  locale: "en-US",
  timezone: "UTC",
  date_format_profile: "numeric",
};
