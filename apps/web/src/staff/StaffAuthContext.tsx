import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase";

interface StaffProfile {
  name: string;
  email: string;
  role: string;
  status: string;
}

interface StaffAuthContextValue {
  user: User | null;
  businessId: string | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextValue>({
  user: null,
  businessId: null,
  staffProfile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setBusinessId(null);
        setStaffProfile(null);
        setLoading(false);
        return;
      }
      try {
        const profileSnap = await getDoc(
          doc(db, "staffProfiles", firebaseUser.uid)
        );
        if (profileSnap.exists()) {
          const bId = profileSnap.data().businessId as string;
          setBusinessId(bId);
          const staffSnap = await getDoc(
            doc(db, `businesses/${bId}/staff/${firebaseUser.uid}`)
          );
          if (staffSnap.exists()) {
            setStaffProfile(staffSnap.data() as StaffProfile);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <StaffAuthContext.Provider
      value={{ user, businessId, staffProfile, loading, signIn, signOut }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}
