import { getPasswordStrength } from "@/lib/validators";

const BAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-500",
];

const LABEL_COLORS = [
  "text-red-300",
  "text-orange-300",
  "text-yellow-300",
  "text-lime-300",
  "text-green-300",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);
  const bars = 4;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? BAR_COLORS[score - 1] : "bg-white/20"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${LABEL_COLORS[score]}`}>{label}</p>
    </div>
  );
}
