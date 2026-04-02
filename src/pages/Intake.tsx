import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Printer } from 'lucide-react';
import logoWordmark from '@/assets/logo-wordmark.svg';

const CREAM = '#F2EDE8';
const NAVY = '#3B4A5A';
const FLAME = '#C45C2E';

const CONDITIONS = [
  'Heart condition', 'High blood pressure', 'Diabetes',
  'Asthma / breathing issues', 'Joint problems', 'Osteoporosis', 'None of the above',
];

const EXERCISE_TYPES = [
  'Weight training', 'Cardio / running', 'Yoga / pilates',
  'Group fitness classes', 'Sports / recreational', 'Walking / hiking', 'None',
];

const DIETARY_APPROACHES = [
  'No restrictions', 'Calorie counting', 'High protein', 'Intermittent fasting',
  'Vegan / plant-based', 'Keto / low carb', 'Gluten-free', 'Other',
];

const SMOKING_ALCOHOL = [
  'I smoke', 'Occasional alcohol', 'Regular alcohol', 'Neither',
];

export default function Intake() {
  const { user, profile, isPaidMember, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Section 01
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [hearAbout, setHearAbout] = useState('');

  // Section 02
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Section 03
  const [conditions, setConditions] = useState<string[]>([]);
  const [takingMeds, setTakingMeds] = useState('');
  const [medsList, setMedsList] = useState('');
  const [recentSurgery, setRecentSurgery] = useState('');
  const [surgeryDesc, setSurgeryDesc] = useState('');
  const [doctorAdvised, setDoctorAdvised] = useState('');
  const [otherMedical, setOtherMedical] = useState('');

  // Section 04
  const [hasInjuries, setHasInjuries] = useState('');
  const [injuryDesc, setInjuryDesc] = useState('');
  const [painLevel, setPainLevel] = useState('');

  // Section 05
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [goalDescription, setGoalDescription] = useState('');

  // Section 06
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [exerciseDays, setExerciseDays] = useState('');
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [gymAccess, setGymAccess] = useState('');

  // Section 07
  const [mealsPerDay, setMealsPerDay] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [dietaryApproach, setDietaryApproach] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState('');
  const [smokingAlcohol, setSmokingAlcohol] = useState<string[]>([]);
  const [lifestyleNotes, setLifestyleNotes] = useState('');

  // Waiver
  const [signature, setSignature] = useState('');
  const [waiverDate, setWaiverDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (profile?.full_name) {
      const parts = (profile.full_name || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
    if (user?.email) setEmail(user.email);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (!isPaidMember) { navigate('/community', { replace: true }); return; }
    if ((profile as any)?.intake_submitted) { navigate('/community', { replace: true }); return; }
  }, [authLoading, user, isPaidMember, profile, navigate]);

  const toggleMulti = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const handlePrintBlank = () => {
    window.print();
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !primaryGoal || !fitnessLevel || !signature) {
      toast.error('Please fill in required fields: name, primary goal, fitness level, and signature.');
      return;
    }
    setSubmitting(true);
    try {
      const responses = {
        section_01_personal: { firstName, lastName, dob, gender, phone, email, address, occupation, hearAbout },
        section_02_emergency: { emergencyName, emergencyRelationship, emergencyPhone },
        section_03_health: { conditions, takingMeds, medsList, recentSurgery, surgeryDesc, doctorAdvised, otherMedical },
        section_04_injuries: { hasInjuries, injuryDesc, painLevel },
        section_05_goals: { primaryGoal, currentWeight, goalWeight, timeframe, goalDescription },
        section_06_fitness: { fitnessLevel, exerciseDays, exerciseTypes, gymAccess },
        section_07_lifestyle: { mealsPerDay, waterIntake, dietaryApproach, sleepHours, stressLevel, smokingAlcohol, lifestyleNotes },
        waiver: { signature, waiverDate },
      };

      const { error: insertError } = await supabase
        .from('intake_forms')
        .insert({ user_id: user!.id, responses });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ intake_submitted: true } as any)
        .eq('id', user!.id);

      if (updateError) throw updateError;

      // Post structured summary to 1:1 chat thread
      try {
        const { data: existingThread } = await supabase
          .from('threads')
          .select('id')
          .eq('user_id', user!.id)
          .limit(1)
          .single();

        let threadId = existingThread?.id;
        if (!threadId) {
          const { data: newThread } = await supabase
            .from('threads')
            .insert({ user_id: user!.id })
            .select('id')
            .single();
          threadId = newThread?.id;
        }

        if (threadId) {
          const submittedDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          });

          // Build structured JSON content for branded rendering
          const summaryData = {
            type: 'intake_form',
            memberId: user!.id,
            memberName: `${firstName} ${lastName}`,
            submittedDate,
            sections: [
              { num: '01', title: 'Personal Information', fields: [
                { label: 'Name', value: `${firstName} ${lastName}` },
                { label: 'Date of Birth', value: dob || 'Not provided' },
                { label: 'Gender', value: gender || 'Not provided' },
                { label: 'Phone', value: phone || 'Not provided' },
                { label: 'Email', value: email },
                { label: 'Address', value: address || 'Not provided' },
                { label: 'Occupation', value: occupation || 'Not provided' },
                { label: 'How did you hear about us', value: hearAbout || 'Not provided' },
              ]},
              { num: '02', title: 'Emergency Contact', fields: [
                { label: 'Name', value: emergencyName || 'Not provided' },
                { label: 'Relationship', value: emergencyRelationship || 'Not provided' },
                { label: 'Phone', value: emergencyPhone || 'Not provided' },
              ]},
              { num: '03', title: 'Health & Medical History', fields: [
                { label: 'Pre-existing Conditions', value: conditions.length ? conditions.join(', ') : 'None' },
                { label: 'Currently Taking Medications', value: takingMeds || 'Not answered' },
                ...(takingMeds === 'Yes' ? [{ label: 'Medications', value: medsList || 'Not listed' }] : []),
                { label: 'Recent Surgery (past 2 years)', value: recentSurgery || 'Not answered' },
                ...(recentSurgery === 'Yes' ? [{ label: 'Surgery Details', value: surgeryDesc || 'Not described' }] : []),
                { label: 'Doctor Advised Not to Exercise', value: doctorAdvised || 'Not answered' },
                { label: 'Other Medical Concerns', value: otherMedical || 'None' },
              ]},
              { num: '04', title: 'Injuries & Physical Limitations', fields: [
                { label: 'Current/Recurring Injuries', value: hasInjuries || 'Not answered' },
                ...(hasInjuries === 'Yes' ? [{ label: 'Injury Details', value: injuryDesc || 'Not described' }] : []),
                { label: 'Pain Level at Rest', value: painLevel || 'Not provided' },
              ]},
              { num: '05', title: 'Fitness Goals', fields: [
                { label: 'Primary Goal', value: primaryGoal },
                { label: 'Current Weight', value: currentWeight ? `${currentWeight} lbs` : 'Not provided' },
                { label: 'Goal Weight', value: goalWeight ? `${goalWeight} lbs` : 'Not provided' },
                { label: 'Target Timeframe', value: timeframe || 'Not provided' },
                { label: 'Goal Description', value: goalDescription || 'Not provided' },
              ]},
              { num: '06', title: 'Current Fitness Level', fields: [
                { label: 'Fitness Level', value: fitnessLevel },
                { label: 'Days/Week Currently Exercising', value: exerciseDays || 'Not provided' },
                { label: 'Exercise Types', value: exerciseTypes.length ? exerciseTypes.join(', ') : 'None' },
                { label: 'Gym Access', value: gymAccess || 'Not provided' },
              ]},
              { num: '07', title: 'Lifestyle & Nutrition Habits', fields: [
                { label: 'Meals per Day', value: mealsPerDay || 'Not provided' },
                { label: 'Water Intake', value: waterIntake || 'Not provided' },
                { label: 'Dietary Approach', value: dietaryApproach.length ? dietaryApproach.join(', ') : 'Not provided' },
                { label: 'Average Sleep', value: sleepHours || 'Not provided' },
                { label: 'Stress Level', value: stressLevel || 'Not provided' },
                { label: 'Smoking/Alcohol', value: smokingAlcohol.length ? smokingAlcohol.join(', ') : 'Not provided' },
                { label: 'Additional Notes', value: lifestyleNotes || 'None' },
              ]},
            ],
          };

          await supabase.from('messages').insert({
            thread_id: threadId,
            sender_id: user!.id,
            content: JSON.stringify(summaryData),
            tag: 'intake_form',
          });
        }

        // Notify coaches
        const { data: coaches } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'pt_admin']);

        for (const coach of coaches || []) {
          await supabase.from('notifications').insert({
            user_id: coach.user_id,
            type: 'intake_submitted',
            title: 'Intake form received',
            body: `${firstName} has submitted their intake form.`,
            reference_id: user!.id,
          } as any);
        }
      } catch (chatErr) {
        console.error('Failed to post intake summary to chat:', chatErr);
      }

      await refreshProfile();
      toast.success('Intake form submitted! Welcome aboard.');
      navigate('/community', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit intake form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="w-8 h-8 border-2 border-[#3B4A5A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-[${FLAME}]/30 focus:border-[${FLAME}]`;
  const labelCls = 'block text-xs font-semibold tracking-wider uppercase mb-1.5';
  const sectionTitleCls = 'text-2xl md:text-3xl font-light tracking-wide';

  return (
    <div ref={formRef} className="min-h-screen intake-form-page" style={{ background: CREAM, color: NAVY, fontFamily: "'Montserrat', sans-serif" }}>
      {/* Print Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Bebas+Neue&family=Montserrat:wght@300;400;500;600&display=swap');
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .intake-form-page { padding: 0 !important; }
        }
      `}</style>

      {/* Fixed Header */}
      <div className="sticky top-0 z-50" style={{ background: CREAM }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logoWordmark} alt="Soul Fuel Society" className="h-8" />
          <div className="text-right">
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em' }}>Client Intake Form</p>
            <p className="text-[10px] tracking-wider uppercase opacity-60" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Personal Training · Confidential</p>
          </div>
        </div>
        <div className="h-1" style={{ background: `linear-gradient(to right, ${NAVY}, ${NAVY}80, transparent)` }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* SECTION 01 */}
        <SectionHeader num="01" title="Personal Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Last Name" required>
            <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={dob} onChange={e => setDob(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Gender">
            <select className={inputCls} value={gender} onChange={e => setGender(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
              <option value="">Select...</option>
              <option>Female</option>
              <option>Male</option>
              <option>Non-binary</option>
              <option>Prefer not to say</option>
            </select>
          </Field>
          <Field label="Phone Number">
            <input type="tel" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Email Address">
            <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Home Address">
              <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
          </div>
          <Field label="Occupation">
            <input className={inputCls} value={occupation} onChange={e => setOccupation(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="How did you hear about us?">
            <select className={inputCls} value={hearAbout} onChange={e => setHearAbout(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
              <option value="">Select...</option>
              <option>Soul Fuel App</option>
              <option>Social Media</option>
              <option>Friend / Referral</option>
              <option>Google Search</option>
              <option>Other</option>
            </select>
          </Field>
        </div>

        {/* SECTION 02 */}
        <SectionHeader num="02" title="Emergency Contact" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Full Name">
            <input className={inputCls} value={emergencyName} onChange={e => setEmergencyName(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Relationship">
            <input className={inputCls} value={emergencyRelationship} onChange={e => setEmergencyRelationship(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
          <Field label="Phone Number">
            <input type="tel" className={inputCls} value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
        </div>

        {/* SECTION 03 */}
        <SectionHeader num="03" title="Health & Medical History" />
        <div className="space-y-5">
          <Field label="Pre-existing Conditions (select all that apply)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {CONDITIONS.map(c => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conditions.includes(c)}
                    onChange={() => toggleMulti(conditions, c, setConditions)}
                    className="w-4 h-4 rounded accent-[#C45C2E]"
                  />
                  {c}
                </label>
              ))}
            </div>
          </Field>
          <RadioField label="Are you currently taking any medications?" value={takingMeds} onChange={setTakingMeds} />
          {takingMeds === 'Yes' && (
            <Field label="Please list your medications">
              <textarea className={inputCls + ' min-h-[60px]'} value={medsList} onChange={e => setMedsList(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
          )}
          <RadioField label="Have you had any surgeries in the past 2 years?" value={recentSurgery} onChange={setRecentSurgery} />
          {recentSurgery === 'Yes' && (
            <Field label="Please describe">
              <textarea className={inputCls + ' min-h-[60px]'} value={surgeryDesc} onChange={e => setSurgeryDesc(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
          )}
          <RadioField label="Has a doctor ever advised you not to exercise?" value={doctorAdvised} onChange={setDoctorAdvised} />
          <Field label="Any other medical concerns your trainer should know about?">
            <textarea className={inputCls + ' min-h-[60px]'} value={otherMedical} onChange={e => setOtherMedical(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
        </div>

        {/* SECTION 04 */}
        <SectionHeader num="04" title="Injuries & Physical Limitations" />
        <div className="space-y-5">
          <RadioField label="Do you have any current or recurring injuries?" value={hasInjuries} onChange={setHasInjuries} />
          {hasInjuries === 'Yes' && (
            <Field label="Describe your injury and affected area">
              <textarea className={inputCls + ' min-h-[60px]'} value={injuryDesc} onChange={e => setInjuryDesc(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
          )}
          <Field label="Pain level at rest">
            <select className={inputCls} value={painLevel} onChange={e => setPainLevel(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
              <option value="">Select...</option>
              <option>0 No pain</option>
              <option>1-2 Mild</option>
              <option>3-4 Moderate</option>
              <option>5-6 Significant</option>
              <option>7+ Severe</option>
            </select>
          </Field>
        </div>

        {/* SECTION 05 */}
        <SectionHeader num="05" title="Fitness Goals" />
        <div className="space-y-5">
          <Field label="Primary Goal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {['Weight loss', 'Muscle gain', 'Improve endurance', 'Increase strength', 'General health & fitness', 'Sport-specific training', 'Post-rehab / recovery'].map(g => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="primaryGoal" checked={primaryGoal === g} onChange={() => setPrimaryGoal(g)} className="accent-[#C45C2E]" />
                  {g}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Current Weight (lbs)">
              <input type="number" className={inputCls} value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
            <Field label="Goal Weight (lbs)">
              <input type="number" className={inputCls} value={goalWeight} onChange={e => setGoalWeight(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
            </Field>
          </div>
          <Field label="Target Timeframe">
            <select className={inputCls} value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
              <option value="">Select...</option>
              <option>4-6 weeks</option>
              <option>3 months</option>
              <option>6 months</option>
              <option>12 months</option>
              <option>Ongoing / no deadline</option>
            </select>
          </Field>
          <Field label="Describe your goal in your own words">
            <textarea className={inputCls + ' min-h-[80px]'} value={goalDescription} onChange={e => setGoalDescription(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
        </div>

        {/* SECTION 06 */}
        <SectionHeader num="06" title="Current Fitness Level" />
        <div className="space-y-5">
          <Field label="How would you describe your fitness level?">
            <div className="flex flex-wrap gap-2 mt-1">
              {['Beginner', 'Intermediate', 'Active', 'Advanced'].map(l => (
                <label key={l} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="fitnessLevel" checked={fitnessLevel === l} onChange={() => setFitnessLevel(l)} className="accent-[#C45C2E]" />
                  {l}
                </label>
              ))}
            </div>
          </Field>
          <Field label="How many days per week do you currently exercise?">
            <select className={inputCls} value={exerciseDays} onChange={e => setExerciseDays(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
              <option value="">Select...</option>
              <option>0 Not currently</option>
              <option>1-2 days</option>
              <option>3-4 days</option>
              <option>5+ days</option>
            </select>
          </Field>
          <Field label="Types of exercise you currently do (select all)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {EXERCISE_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={exerciseTypes.includes(t)} onChange={() => toggleMulti(exerciseTypes, t, setExerciseTypes)} className="w-4 h-4 rounded accent-[#C45C2E]" />
                  {t}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Do you have access to a gym?">
            <div className="flex flex-wrap gap-4 mt-1">
              {['Yes full gym', 'Home gym / equipment', 'Minimal / no equipment'].map(g => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="gymAccess" checked={gymAccess === g} onChange={() => setGymAccess(g)} className="accent-[#C45C2E]" />
                  {g}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* SECTION 07 */}
        <SectionHeader num="07" title="Lifestyle & Nutrition Habits" />
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="How many meals do you eat per day?">
              <select className={inputCls} value={mealsPerDay} onChange={e => setMealsPerDay(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
                <option value="">Select...</option>
                <option>1-2</option>
                <option>3</option>
                <option>4-5</option>
                <option>6+</option>
              </select>
            </Field>
            <Field label="Water intake per day">
              <select className={inputCls} value={waterIntake} onChange={e => setWaterIntake(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
                <option value="">Select...</option>
                <option>Less than 4 cups</option>
                <option>4-6 cups</option>
                <option>7-10 cups</option>
                <option>More than 10 cups</option>
              </select>
            </Field>
          </div>
          <Field label="Dietary approach (select all that apply)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {DIETARY_APPROACHES.map(d => (
                <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={dietaryApproach.includes(d)} onChange={() => toggleMulti(dietaryApproach, d, setDietaryApproach)} className="w-4 h-4 rounded accent-[#C45C2E]" />
                  {d}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Average sleep per night">
              <select className={inputCls} value={sleepHours} onChange={e => setSleepHours(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
                <option value="">Select...</option>
                <option>Less than 5 hours</option>
                <option>5-6 hours</option>
                <option>7-8 hours</option>
                <option>More than 8 hours</option>
              </select>
            </Field>
            <Field label="Stress level">
              <select className={inputCls} value={stressLevel} onChange={e => setStressLevel(e.target.value)} style={{ borderColor: '#d1cbc4' }}>
                <option value="">Select...</option>
                <option>1-3 Low</option>
                <option>4-6 Moderate</option>
                <option>7-9 High</option>
                <option>10 Very high</option>
              </select>
            </Field>
          </div>
          <Field label="Smoking / Alcohol (select all that apply)">
            <div className="flex flex-wrap gap-4 mt-1">
              {SMOKING_ALCOHOL.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={smokingAlcohol.includes(s)} onChange={() => toggleMulti(smokingAlcohol, s, setSmokingAlcohol)} className="w-4 h-4 rounded accent-[#C45C2E]" />
                  {s}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Is there anything else about your lifestyle you'd like to share?">
            <textarea className={inputCls + ' min-h-[80px]'} value={lifestyleNotes} onChange={e => setLifestyleNotes(e.target.value)} style={{ borderColor: '#d1cbc4' }} />
          </Field>
        </div>

        {/* LIABILITY DISCLAIMER */}
        <div className="rounded-xl p-6 md:p-8" style={{ background: NAVY, color: CREAM }}>
          <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Liability Waiver & Consent</h3>
          <p className="text-sm leading-relaxed opacity-90 mb-6">
            I acknowledge that participation in a personal training program involves physical activity that carries inherent risk of injury.
            I confirm that I have disclosed all relevant medical information and accept full responsibility for my participation.
            I release Soul Fuel Society, its coaches, and affiliates from any liability arising from my training. I understand that my trainer
            is a certified fitness professional and not a licensed medical provider. I have read and agree to the terms above.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase mb-1.5" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#d1cbc4' }}>Signature (type full name)</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: CREAM }}
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase mb-1.5" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#d1cbc4' }}>Date</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: CREAM }}
                value={waiverDate}
                onChange={e => setWaiverDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8 no-print">
          <button
            type="button"
            onClick={handlePrintBlank}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 text-sm font-semibold tracking-wider uppercase transition-colors"
            style={{ borderColor: NAVY, color: NAVY, fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px', letterSpacing: '0.08em' }}
          >
            <Printer className="w-4 h-4" />
            Print Form
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold tracking-wider uppercase transition-colors relative overflow-hidden"
            style={{
              background: NAVY,
              color: CREAM,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '15px',
              letterSpacing: '0.08em',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit'}
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5" style={{ background: FLAME }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-4">
      <span className="text-sm font-bold tracking-wider" style={{ color: FLAME, fontFamily: "'Bebas Neue', sans-serif" }}>
        {num}
      </span>
      <h2 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}>
        {title}
      </h2>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wider uppercase mb-1.5" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6b7280' }}>
        {label}{required && <span style={{ color: FLAME }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function RadioField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-6 mt-1">
        {['Yes', 'No'].map(v => (
          <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={value === v} onChange={() => onChange(v)} className="accent-[#C45C2E]" />
            {v}
          </label>
        ))}
      </div>
    </Field>
  );
}
