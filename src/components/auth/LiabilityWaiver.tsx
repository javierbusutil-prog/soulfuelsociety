import { useState, useRef, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import logoStacked from '@/assets/logo-stacked.svg';

interface LiabilityWaiverProps {
  onAccept: () => void;
  loading: boolean;
  pdfUrl: string;
}

export default function LiabilityWaiver({ onAccept, loading, pdfUrl }: LiabilityWaiverProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToBottom(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:max-w-2xl sm:mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <img src={logoStacked} alt="Soul Fuel Society" className="h-10 w-auto mb-4" />
          <h1 className="font-display text-lg font-medium tracking-editorial text-center">
            Before you join, please read and accept our waiver.
          </h1>
          <p className="text-xs text-destructive mt-1 text-center">
            You must read and accept this agreement to create your account.
          </p>
        </div>

        {/* Scrollable waiver */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto border border-border rounded-lg p-4 text-sm text-foreground leading-relaxed mb-4"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          <WaiverText />
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3 mb-4">
          <Checkbox
            id="waiver-accept"
            disabled={!scrolledToBottom}
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="waiver-accept"
            className={`text-xs leading-snug cursor-pointer ${
              !scrolledToBottom ? 'text-muted-foreground/50' : 'text-foreground'
            }`}
          >
            I have read, understood, and agree to the Soul Fuel Society Liability Waiver, Release of Claims, and Assumption of Risk Agreement.
          </label>
        </div>

        {/* Submit button */}
        <Button
          size="lg"
          className="w-full"
          disabled={!accepted || loading}
          onClick={onAccept}
        >
          {loading ? 'Creating account...' : 'Create my account'}
        </Button>

        {/* PDF download link */}
        <div className="text-center mt-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Download a copy of this waiver
          </a>
        </div>
      </div>
    </div>
  );
}

function WaiverText() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-center">SOUL FUEL SOCIETY, LLC</h2>
      <h3 className="text-sm font-semibold text-center">Liability Waiver, Release of Claims and Assumption of Risk</h3>
      <p className="italic">Please read this entire document carefully before using Soul Fuel Society.</p>

      <div>
        <h4 className="font-semibold mb-1">1. PARTIES</h4>
        <p>This Liability Waiver, Release of Claims, and Assumption of Risk Agreement is entered into between Soul Fuel Society, LLC, a Florida limited liability company, and you, the individual accessing or using the Soul Fuel Society mobile application or platform. By creating an account, accessing the platform, or using any of our services, you acknowledge that you have read, understood, and agree to be legally bound by this Agreement.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">2. DESCRIPTION OF SERVICES</h4>
        <p>Soul Fuel Society, LLC provides the following services: online training programs including personalized workout plans delivered digitally; in-person personal training sessions conducted by certified coaches; nutritional guidance, macro tracking tools, and general dietary recommendations; health and fitness tracking features including menstrual cycle tracking, intermittent fasting tracking, and macro logging; access to fitness e-books, general fitness programs, and educational content; and a fitness community platform for accountability and support.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">3. ASSUMPTION OF RISK</h4>
        <p>YOU EXPRESSLY ACKNOWLEDGE AND ASSUME ALL RISKS associated with participating in physical fitness activities, exercise programs, and personal training sessions, whether conducted online or in person. These risks include but are not limited to: physical injury including sprains, strains, fractures, or other musculoskeletal injuries; cardiovascular events including heart attack or stroke; dizziness, fainting, or loss of consciousness; aggravation of pre-existing medical conditions; accidents or injuries from exercise equipment; adverse reactions to nutritional guidance; and death or permanent disability resulting from participation. You acknowledge that your participation is entirely voluntary.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">4. HEALTH REPRESENTATIONS AND MEDICAL CLEARANCE</h4>
        <p>By agreeing to this waiver you represent that: you are in good physical health with no known conditions preventing safe participation; you have consulted or will consult a physician before beginning any exercise program; you will inform your coach of any changes to your health status or injuries; you understand that nutritional guidance is for informational purposes only and does not constitute medical advice; and you are 18 years of age or older or have obtained written parental consent.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">5. RELEASE OF LIABILITY AND WAIVER OF CLAIMS</h4>
        <p>IN CONSIDERATION OF BEING PERMITTED TO USE THE SERVICES PROVIDED BY SOUL FUEL SOCIETY, LLC, YOU HEREBY VOLUNTARILY AND IRREVOCABLY RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE Soul Fuel Society, LLC, its members, managers, officers, employees, agents, coaches, contractors, successors, and assigns from any and all claims, demands, causes of action, damages, losses, costs, and expenses arising out of or related to your participation in any training or coaching session; reliance on any nutritional guidance or health information; use of any fitness tracking features; any injury, illness, death, or loss resulting from your use of the Services; and the negligence of any Released Party. THIS MEANS YOU ARE GIVING UP SUBSTANTIAL LEGAL RIGHTS.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">6. INDEMNIFICATION</h4>
        <p>You agree to indemnify and hold harmless Soul Fuel Society, LLC and all Released Parties from any claims, liabilities, damages, losses, and expenses including attorneys fees arising out of your breach of this Agreement, violation of any law, use of the Services, or any misrepresentation regarding your health status.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">7. HEALTH DATA AND PRIVACY</h4>
        <p>The platform collects personal health data including workout logs, nutritional data, menstrual cycle information, fasting data, and fitness metrics. By using the Services you consent to the collection, storage, and use of this data to provide personalized coaching. Soul Fuel Society, LLC will not sell or disclose your health data to third parties without your explicit consent except as required by law.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">8. NUTRITIONAL GUIDANCE DISCLAIMER</h4>
        <p>Nutritional guidance provided through Soul Fuel Society is for general informational purposes only and does not constitute medical advice, registered dietitian services, a medically prescribed nutrition plan, or treatment for any eating disorder or medical condition. Consult a licensed medical professional before following any nutritional guidance if you have specific dietary needs or a diagnosed condition.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">9. IN-PERSON TRAINING ADDITIONAL TERMS</h4>
        <p>For in-person training members: you agree to arrive in appropriate athletic attire; you agree to inform your coach of injuries or health changes before each session; cancellations within 24 hours of a scheduled session count as a used session; and Soul Fuel Society, LLC is not responsible for personal property lost, stolen, or damaged at any training location.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">10. LIMITATION OF LIABILITY</h4>
        <p>TO THE FULLEST EXTENT PERMITTED BY FLORIDA LAW, SOUL FUEL SOCIETY, LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICES. TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE THREE MONTHS PRECEDING THE CLAIM.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">11. GOVERNING LAW AND DISPUTE RESOLUTION</h4>
        <p>This Agreement is governed by the laws of the State of Florida. Any dispute shall be resolved exclusively in the state or federal courts of Miami-Dade County, Florida.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">12. SEVERABILITY AND ENTIRE AGREEMENT</h4>
        <p>If any provision is found invalid or unenforceable the remaining provisions continue in full force. This Agreement constitutes the entire agreement between you and Soul Fuel Society, LLC regarding its subject matter.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">13. AMENDMENTS</h4>
        <p>Soul Fuel Society, LLC reserves the right to update this Agreement at any time. Continued use of the Services after notification of changes constitutes acceptance of the updated Agreement.</p>
      </div>

      <div>
        <h4 className="font-semibold mb-1">14. ACKNOWLEDGMENT AND ELECTRONIC ACCEPTANCE</h4>
        <p>BY CHECKING THE ACCEPTANCE BOX YOU ACKNOWLEDGE THAT YOU HAVE READ THIS AGREEMENT IN ITS ENTIRETY, FULLY UNDERSTAND ITS TERMS, ARE 18 YEARS OF AGE OR OLDER, AND VOLUNTARILY AGREE TO BE BOUND BY ALL TERMS. YOUR ELECTRONIC ACCEPTANCE IS A LEGALLY BINDING SIGNATURE UNDER THE E-SIGN ACT AND APPLICABLE FLORIDA LAW.</p>
      </div>

      <p className="text-muted-foreground text-xs mt-6">This Agreement was last updated: March 2026</p>
      <p className="text-muted-foreground text-xs">Soul Fuel Society, LLC | Florida</p>
    </div>
  );
}
