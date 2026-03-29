export function NutritionDisclaimerLabel({ variant = 'default' }: { variant?: 'default' | 'coach-note' | 'ebook-banner' | 'coach-reminder' }) {
  if (variant === 'ebook-banner') {
    return (
      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 mb-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          The following content is for general fitness and wellness education only. It is not medical advice and should not replace guidance from a licensed dietitian or physician.
        </p>
      </div>
    );
  }

  if (variant === 'coach-note') {
    return (
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        This is general wellness guidance and does not constitute medical or dietitian advice. Consult a licensed professional if you have specific dietary needs.
      </p>
    );
  }

  if (variant === 'coach-reminder') {
    return (
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed italic">
        Reminder: frame all nutrition content as general wellness suggestions, not personalized dietary prescriptions. Avoid language like "you must eat" or "your diet requires." Use language like "a general starting point" or "suggested targets based on common fitness principles."
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground text-center pt-2">
      For general wellness only — not medical or dietitian advice.
    </p>
  );
}
