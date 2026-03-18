import { useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { User } from 'firebase/auth';

export default function HomeGroupsLink() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);

    const current = getCurrentUser();
    if (current) {
      setUser(current);
    }

    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  if (!mounted || !user) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <a
        href={getRoute('/groups')}
        className="inline-block bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] px-6 py-3 rounded-lg hover:bg-[color:var(--pc-accent-dark)] transition"
      >
        Ir a grupos
      </a>
    </div>
  );
}

