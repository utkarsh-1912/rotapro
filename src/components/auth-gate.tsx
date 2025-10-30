"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useUser } from "@/firebase/provider";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { setUser, setProfile, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(user);
    setLoading(isUserLoading);
    
    let unsubscribe: () => void = () => {};

    if (user) {
      const firestore = getFirestore();
      const profileRef = doc(firestore, "users", user.uid);
      unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
      });
    } else {
      setProfile(null);
    }
    
    return () => unsubscribe();
    
  }, [user, isUserLoading, setProfile, setUser, setLoading]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      // Allow access to landing, login, and signup pages
      if (pathname !== "/" && pathname !== "/login" && pathname !== "/signup") {
        router.replace(`/login?redirect=${pathname}`);
      }
    }
  }, [isUserLoading, user, router, pathname]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
