/**
 * KPI templates distilled from the H06 Staff Job Descriptions document.
 * HR applies a template to a person in one click, then tunes targets and
 * weights. Cadence: daily KPIs are scored per day; weekly per week.
 * Weight 1-5: how much the duty counts in the weighted weekly score.
 */
export interface KpiTemplate {
  title: string;
  cadence: "daily" | "weekly";
  target: number;
  weight: number;
}

export const KPI_TEMPLATES: Record<string, { label: string; kpis: KpiTemplate[] }> = {
  general_manager: {
    label: "General Manager",
    kpis: [
      { title: "Departmental reports reviewed with direction given", cadence: "weekly", target: 1, weight: 4 },
      { title: "Revenue & performance check-in against targets", cadence: "weekly", target: 1, weight: 5 },
      { title: "Business development / partner engagements held", cadence: "weekly", target: 2, weight: 4 },
      { title: "Approvals & key decisions turned around within 48h", cadence: "weekly", target: 1, weight: 3 },
      { title: "Compliance or SOP issue review", cadence: "weekly", target: 1, weight: 3 },
    ],
  },
  social_media_manager: {
    label: "Social Media Manager",
    kpis: [
      { title: "Instagram Story updated", cadence: "daily", target: 1, weight: 4 },
      { title: "DMs & comments answered same day", cadence: "daily", target: 1, weight: 4 },
      { title: "Feed posts published", cadence: "weekly", target: 4, weight: 4 },
      { title: "Content shoot coordinated", cadence: "weekly", target: 1, weight: 3 },
      { title: "Content calendar maintained & up to date", cadence: "weekly", target: 1, weight: 2 },
      { title: "Performance metrics report submitted", cadence: "weekly", target: 1, weight: 3 },
    ],
  },
  sales_manager: {
    label: "Sales Manager",
    kpis: [
      { title: "New client / partner outreaches made", cadence: "daily", target: 3, weight: 4 },
      { title: "Open leads followed up", cadence: "daily", target: 2, weight: 4 },
      { title: "Proposals or quotes sent", cadence: "weekly", target: 3, weight: 4 },
      { title: "Corporate / retainer meetings held", cadence: "weekly", target: 2, weight: 3 },
      { title: "Sales report with target progress submitted", cadence: "weekly", target: 1, weight: 4 },
    ],
  },
  accountant_office_manager: {
    label: "Accountant / Office Manager",
    kpis: [
      { title: "Daily transactions recorded & reconciled", cadence: "daily", target: 1, weight: 5 },
      { title: "Weekly financial report submitted", cadence: "weekly", target: 1, weight: 5 },
      { title: "Outstanding debt follow-ups made", cadence: "weekly", target: 3, weight: 4 },
      { title: "Vendor invoices reconciled", cadence: "weekly", target: 1, weight: 3 },
      { title: "Statutory & tax deadlines tracked — none missed", cadence: "weekly", target: 1, weight: 4 },
    ],
  },
  hr_manager: {
    label: "HR Manager",
    kpis: [
      { title: "Attendance & employee records updated", cadence: "daily", target: 1, weight: 3 },
      { title: "KPI scores updated for all staff", cadence: "weekly", target: 1, weight: 5 },
      { title: "Employee concerns addressed & logged", cadence: "weekly", target: 1, weight: 3 },
      { title: "Recruitment / onboarding actions progressed", cadence: "weekly", target: 1, weight: 2 },
      { title: "Compliance & SOP adherence check completed", cadence: "weekly", target: 1, weight: 3 },
    ],
  },
  maintenance_manager: {
    label: "Maintenance Manager",
    kpis: [
      { title: "Fuel records updated", cadence: "daily", target: 1, weight: 5 },
      { title: "Fleet inspections completed (Tue & Thu)", cadence: "weekly", target: 2, weight: 5 },
      { title: "Inspection reports submitted promptly", cadence: "weekly", target: 2, weight: 3 },
      { title: "Maintenance records updated after each job", cadence: "weekly", target: 1, weight: 3 },
      { title: "Scheduled servicing on plan — none missed", cadence: "weekly", target: 1, weight: 4 },
    ],
  },
  operations_manager: {
    label: "Operations Manager",
    kpis: [
      { title: "Driver inspection checklists reviewed", cadence: "daily", target: 1, weight: 5 },
      { title: "Daily deployment coordinated without incident", cadence: "daily", target: 1, weight: 4 },
      { title: "Maintenance oversight review held", cadence: "weekly", target: 2, weight: 3 },
      { title: "Fuel funding requests submitted on time", cadence: "weekly", target: 1, weight: 2 },
      { title: "Operational report submitted", cadence: "weekly", target: 1, weight: 3 },
      { title: "Partner / fleet-owner engagements", cadence: "weekly", target: 1, weight: 2 },
    ],
  },
  professional_driver: {
    label: "Professional Driver",
    kpis: [
      { title: "Pre & post-trip inspections completed", cadence: "daily", target: 1, weight: 4 },
      { title: "On-time pickups — no lateness", cadence: "daily", target: 1, weight: 5 },
      { title: "Vehicle clean & presentable", cadence: "daily", target: 1, weight: 3 },
      { title: "Zero traffic / conduct incidents", cadence: "weekly", target: 1, weight: 4 },
      { title: "Maintenance issues reported promptly", cadence: "weekly", target: 1, weight: 2 },
    ],
  },
};
