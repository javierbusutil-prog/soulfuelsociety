export interface IntakeSection {
  num: string;
  title: string;
  fields: { label: string; value: string }[];
}

export interface IntakeSummaryData {
  type: 'intake_form';
  memberId: string;
  memberName: string;
  submittedDate: string;
  sections: IntakeSection[];
}

export function buildIntakeSummary(responses: any, memberId: string, submittedAtIso: string): IntakeSummaryData {
  const p = responses?.section_01_personal ?? {};
  const e = responses?.section_02_emergency ?? {};
  const h = responses?.section_03_health ?? {};
  const inj = responses?.section_04_injuries ?? {};
  const g = responses?.section_05_goals ?? {};
  const f = responses?.section_06_fitness ?? {};
  const l = responses?.section_07_lifestyle ?? {};

  const submittedDate = new Date(submittedAtIso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return {
    type: 'intake_form',
    memberId,
    memberName: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Unknown',
    submittedDate,
    sections: [
      { num: '01', title: 'Personal Information', fields: [
        { label: 'Name', value: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() },
        { label: 'Date of Birth', value: p.dob || 'Not provided' },
        { label: 'Gender', value: p.gender || 'Not provided' },
        { label: 'Phone', value: p.phone || 'Not provided' },
        { label: 'Email', value: p.email || 'Not provided' },
        { label: 'Address', value: p.address || 'Not provided' },
        { label: 'Occupation', value: p.occupation || 'Not provided' },
        { label: 'How did you hear about us', value: p.hearAbout || 'Not provided' },
      ]},
      { num: '02', title: 'Emergency Contact', fields: [
        { label: 'Name', value: e.emergencyName || 'Not provided' },
        { label: 'Relationship', value: e.emergencyRelationship || 'Not provided' },
        { label: 'Phone', value: e.emergencyPhone || 'Not provided' },
      ]},
      { num: '03', title: 'Health & Medical History', fields: [
        { label: 'Pre-existing Conditions', value: (h.conditions?.length ? h.conditions.join(', ') : 'None') },
        { label: 'Currently Taking Medications', value: h.takingMeds || 'Not answered' },
        ...(h.takingMeds === 'Yes' ? [{ label: 'Medications', value: h.medsList || 'Not listed' }] : []),
        { label: 'Recent Surgery (past 2 years)', value: h.recentSurgery || 'Not answered' },
        ...(h.recentSurgery === 'Yes' ? [{ label: 'Surgery Details', value: h.surgeryDesc || 'Not described' }] : []),
        { label: 'Doctor Advised Not to Exercise', value: h.doctorAdvised || 'Not answered' },
        { label: 'Other Medical Concerns', value: h.otherMedical || 'None' },
      ]},
      { num: '04', title: 'Injuries & Physical Limitations', fields: [
        { label: 'Current/Recurring Injuries', value: inj.hasInjuries || 'Not answered' },
        ...(inj.hasInjuries === 'Yes' ? [{ label: 'Injury Details', value: inj.injuryDesc || 'Not described' }] : []),
        { label: 'Pain Level at Rest', value: inj.painLevel || 'Not provided' },
      ]},
      { num: '05', title: 'Fitness Goals', fields: [
        { label: 'Primary Goal', value: g.primaryGoal || 'Not provided' },
        { label: 'Current Weight', value: g.currentWeight ? `${g.currentWeight} lb` : 'Not provided' },
        { label: 'Goal Weight', value: g.goalWeight ? `${g.goalWeight} lb` : 'Not provided' },
        { label: 'Target Timeframe', value: g.timeframe || 'Not provided' },
        { label: 'Goal Description', value: g.goalDescription || 'Not provided' },
      ]},
      { num: '06', title: 'Current Fitness Level', fields: [
        { label: 'Fitness Level', value: f.fitnessLevel || 'Not provided' },
        { label: 'Days/Week Currently Exercising', value: f.exerciseDays || 'Not provided' },
        { label: 'Exercise Types', value: (f.exerciseTypes?.length ? f.exerciseTypes.join(', ') : 'None') },
        { label: 'Gym Access', value: f.gymAccess || 'Not provided' },
      ]},
      { num: '07', title: 'Lifestyle & Nutrition Habits', fields: [
        { label: 'Meals per Day', value: l.mealsPerDay || 'Not provided' },
        { label: 'Water Intake', value: l.waterIntake || 'Not provided' },
        { label: 'Dietary Approach', value: (l.dietaryApproach?.length ? l.dietaryApproach.join(', ') : 'Not provided') },
        { label: 'Average Sleep', value: l.sleepHours || 'Not provided' },
        { label: 'Stress Level', value: l.stressLevel || 'Not provided' },
        { label: 'Smoking/Alcohol', value: (l.smokingAlcohol?.length ? l.smokingAlcohol.join(', ') : 'Not provided') },
        { label: 'Additional Notes', value: l.lifestyleNotes || 'None' },
      ]},
    ],
  };
}