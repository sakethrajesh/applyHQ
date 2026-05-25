export interface ResumeEntry {
  organization: string;
  dates: string;
  role: string;
  location: string;
  bullets: string[];
  header_line: string;
  full_block: string;
  bullets_block: string;
}

export interface ResumeSection {
  title: string;
  entries: ResumeEntry[];
  lines: string[];
}

export interface ParsedResume {
  source_path: string;
  display_name: string;
  heading_name: string;
  heading_contact: string;
  heading_meta: string;
  heading_all: string;
  sections: ResumeSection[];
}

export interface Project {
  id: string;
  name: string;
}

export interface TexFile {
  path: string;
  name: string;
}
