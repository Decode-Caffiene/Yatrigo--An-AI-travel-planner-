import Image from "next/image";

export function Avatar({
  name,
  avatar,
  size = 40,
}: {
  name: string;
  avatar: string | null;
  size?: number;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 overflow-hidden rounded-full bg-primary text-on-primary"
    >
      {avatar ? (
        <Image src={avatar} alt={name} fill className="object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{ fontSize: size * 0.4 }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
