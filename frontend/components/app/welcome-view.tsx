import { ArogyaSaathiHealthDisclaimer } from '@/components/app/arogyaasaathi-health-disclaimer';
import { ArogyaSaathiHero } from '@/components/app/arogyaasaathi-hero';

interface WelcomeViewProps {
  startButtonText: string;
  isConnecting?: boolean;
  wasEnded?: boolean;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  isConnecting = false,
  wasEnded = false,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="relative min-h-screen w-full overflow-x-hidden pt-6">
      {/* Full-Screen Image 3 Background (Clearly Visible) */}
      <div className="fixed inset-0 -z-20 h-full w-full overflow-hidden">
        <img
          src="/images/arogyasaathi_bg.jpg"
          alt="ArogyaSaathi Health Companion"
          className="h-full w-full scale-102 object-cover brightness-105 filter"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/40" />
      </div>

      <ArogyaSaathiHero
        startButtonText={startButtonText}
        isConnecting={isConnecting}
        wasEnded={wasEnded}
        onStartCall={onStartCall}
      />

      <ArogyaSaathiHealthDisclaimer />

      <div className="relative flex w-full items-center justify-center py-6">
        <p className="max-w-prose rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-center text-xs font-medium text-white/80 backdrop-blur-md md:text-sm">
          Designed for Bharat 🇮🇳 • Simple conversations • Local language voice AI
        </p>
      </div>
    </div>
  );
};
