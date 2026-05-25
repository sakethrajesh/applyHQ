from pathlib import Path

from resume_parser.parser import parse_resume_file


FIXTURE = Path(__file__).resolve().parent / "fixtures" / "sample_resume.tex"


def test_parse_sample_resume() -> None:
    resume = parse_resume_file(FIXTURE)
    assert resume.heading_name == "Jane Doe"
    assert "555" in resume.heading_contact
    assert len(resume.sections) >= 3

    experience = next(s for s in resume.sections if s.title == "Experience")
    assert experience.entries[0].organization == "ATLAS SP"
    assert experience.entries[0].bullets
    assert "100MM" in experience.entries[0].bullets[0]

    education = next(s for s in resume.sections if s.title == "Education")
    assert "Virginia Tech" in education.entries[0].organization

    skills = next(s for s in resume.sections if "Skills" in s.title)
    assert any("Bloomberg" in line for line in skills.lines)


def test_parse_organizations_section() -> None:
    path = Path(__file__).resolve().parent / "fixtures" / "organizations_section.tex"
    resume = parse_resume_file(path)
    orgs = next(s for s in resume.sections if s.title == "Organizations")
    assert len(orgs.entries) == 1
    assert "BASIS" in orgs.entries[0].organization
    assert orgs.entries[0].role == "Financials Sector Head and Investment Committee Member"
    assert len(orgs.entries[0].bullets) == 2
    assert "1MM" in orgs.entries[0].bullets[0]
