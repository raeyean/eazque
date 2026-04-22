import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, functions } from "../config/firebase";

interface AuthState {
  user: User | null;
  businessId: string | null;
  role: "owner" | "staff" | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    businessName: string,
    ownerName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    businessId: null,
    role: null,
    loading: true,
  });
  const signingUpRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (signingUpRef.current) return;

      if (user) {
        try {
          const profileSnap = await getDoc(doc(db, "staffProfiles", user.uid));
          if (profileSnap.exists()) {
            const bId = profileSnap.data().businessId as string;
            const staffSnap = await getDoc(
              doc(db, `businesses/${bId}/staff/${user.uid}`)
            );
            const role = staffSnap.exists()
              ? (staffSnap.data().role as "owner" | "staff")
              : null;
            setState({ user, businessId: bId, role, loading: false });
          } else {
            setState({ user, businessId: null, role: null, loading: false });
          }
        } catch {
          setState({ user, businessId: null, role: null, loading: false });
        }
      } else {
        setState({ user: null, businessId: null, role: null, loading: false });
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    businessName: string,
    ownerName: string
  ) => {
    signingUpRef.current = true;
    try {
      const callable = httpsCallable<
        { email: string; password: string; ownerName: string; businessName: string },
        { uid: string; businessId: string }
      >(functions, "createBusinessAccount");
      const { data } = await callable({ email, password, ownerName, businessName });

      const userCred = await signInWithEmailAndPassword(auth, email, password);

      setState({ user: userCred.user, businessId: data.businessId, role: "owner", loading: false });
    } finally {
      signingUpRef.current = false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
