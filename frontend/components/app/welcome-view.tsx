import { ArogyaSaathiHero } from '@/components/app/arogyaasaathi-hero';
import { ArogyaSaathiHealthDisclaimer } from '@/components/app/arogyaasaathi-health-disclaimer';

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
      <div className="fixed inset-0 -z-20 w-full h-full overflow-hidden">
        <img
          src="/images/arogyasaathi_bg.jpg"
          alt="ArogyaSaathi Health Companion"
          className="w-full h-full object-cover scale-102 filter brightness-105"
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

      <div className="relative py-6 flex w-full items-center justify-center">
        <p className="text-white/80 max-w-prose text-xs md:text-sm font-medium text-center backdrop-blur-md px-4 py-1.5 rounded-full bg-black/40 border border-white/10">
          Designed for Bharat 🇮🇳 • Simple conversations • Local language voice AI
        </p>
      </div>
    </div>
  );
};

