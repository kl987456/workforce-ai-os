export interface PersonResult {
  externalId: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  yearsExperience: number;
  skills: string[];
  summary: string;
  matchScore: number;
}

export interface ParsedJobQuery {
  raw: string;
  keywords: string[];
  seniority?: string;
  location?: string;
}

export interface PeopleSearchProvider {
  /** Machine-readable id shown in the UI so it's obvious which backend answered the query. */
  id: string;
  label: string;
  search(query: ParsedJobQuery, limit?: number): Promise<PersonResult[]>;
}
