import Image from 'next/image';
import Link from 'next/link';

/** Logo FOM (fichier fourni : public/images/logo-fom.png, 720 × 330, fond transparent). */
export function Logo({ href = '/espace', width = 112, priority = false }: { href?: string; width?: number; priority?: boolean }) {
  return (
    <Link href={href} aria-label="FOM" className="inline-block transition hover:opacity-90">
      <Image src="/images/logo-fom.png" alt="FOM" width={720} height={330} priority={priority} style={{ width, height: 'auto' }} />
    </Link>
  );
}
