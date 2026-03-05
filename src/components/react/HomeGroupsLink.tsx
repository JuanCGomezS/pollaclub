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
        className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        Ir a grupos
      </a>
    </div>
  );
}

