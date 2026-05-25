from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class ResumeEntry(BaseModel):
    organization: str
    dates: str = ""
    role: str = ""
    location: str = ""
    bullets: list[str] = Field(default_factory=list)

    @computed_field
    @property
    def header_line(self) -> str:
        parts = [self.organization, self.role, self.dates, self.location]
        return " | ".join(p for p in parts if p)

    @computed_field
    @property
    def full_block(self) -> str:
        lines = [self.header_line] if self.header_line else []
        lines.extend(f"- {b}" for b in self.bullets)
        return "\n".join(lines)

    @computed_field
    @property
    def bullets_block(self) -> str:
        """All bullet descriptions only (no org/role/dates header)."""
        return "\n".join(self.bullets)


class ResumeSection(BaseModel):
    title: str
    entries: list[ResumeEntry] = Field(default_factory=list)
    lines: list[str] = Field(default_factory=list)


class ParsedResume(BaseModel):
    source_path: str = ""
    display_name: str = ""
    heading_name: str = ""
    heading_contact: str = ""
    heading_meta: str = ""
    sections: list[ResumeSection] = Field(default_factory=list)

    @computed_field
    @property
    def heading_all(self) -> str:
        return "\n".join(
            line for line in [self.heading_name, self.heading_contact, self.heading_meta] if line
        )
